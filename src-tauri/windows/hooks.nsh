; The app registers itself to launch at login (HKCU Run key). Remove that entry on
; uninstall so Windows doesn't try to start a deleted app. Upgrades also run the old
; uninstaller (with /UPDATE); keep the entry then.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Quick Pending"
  ${EndIf}
!macroend
