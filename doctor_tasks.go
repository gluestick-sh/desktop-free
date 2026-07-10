package main

import (
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/gluestick-sh/core/engine"
)

func (a *App) tryStartDoctor() bool {
	a.doctorMu.Lock()
	defer a.doctorMu.Unlock()
	if a.doctorBusy {
		return false
	}
	a.doctorBusy = true
	return true
}

func (a *App) finishDoctor() {
	a.doctorMu.Lock()
	a.doctorBusy = false
	a.doctorMu.Unlock()
}

func toDoctorCheck(c engine.DoctorCheck) DoctorCheck {
	return DoctorCheck{
		ID:        c.ID,
		OK:        c.OK,
		DetailKey: c.DetailKey,
		Detail:    c.DetailText,
		HintKey:   c.HintKey,
		Hint:      c.Hint,
	}
}

func (a *App) runDoctorTask() {
	defer a.finishDoctor()

	runtime.EventsEmit(a.ctx, "doctor:start", nil)

	report := a.engine.RunDoctorProgress(a.ctx,
		func(id string) {
			runtime.EventsEmit(a.ctx, "doctor:running", map[string]string{"id": id})
		},
		func(c engine.DoctorCheck) {
			runtime.EventsEmit(a.ctx, "doctor:check", toDoctorCheck(c))
		},
	)

	logged := true
	var logErr string
	if err := a.engine.RecordDoctorActivity(report); err != nil {
		logged = false
		logErr = err.Error()
		runtime.LogError(a.ctx, fmt.Sprintf("RecordDoctorActivity: %v", err))
	} else {
		a.emitActivityLogUpdated()
	}

	runtime.EventsEmit(a.ctx, "doctor:complete", map[string]interface{}{
		"ok":               report.OK,
		"activityLogged":   logged,
		"activityLogError": logErr,
	})
}
