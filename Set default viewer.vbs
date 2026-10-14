Option Explicit
Dim shell, files, root, script, result
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
script = files.BuildPath(root, "scripts\set-defaults.ps1")
result = shell.Run("powershell.exe -NoProfile -ExecutionPolicy Bypass -File " & Chr(34) & script & Chr(34), 0, True)
If result = 0 Then
  MsgBox "The viewer is registered for all supported formats. Confirm defaults on the opened Windows Settings page. SVG is excluded.", vbInformation, "Video Audio Image Viewer"
Else
  MsgBox "Registration failed. See DATA\associations and Windows Default apps.", vbExclamation, "Video Audio Image Viewer"
End If
