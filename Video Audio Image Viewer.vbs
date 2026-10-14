Option Explicit
Dim sh, fso, root, exe, command, arg, shortcut
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
exe = fso.BuildPath(root, "app\Video Audio Image Viewer-win32-x64\VideoAudioImageViewer.exe")
If Not fso.FileExists(exe) Then
  MsgBox "Run setup_and_run.bat first.", vbInformation, "Video Audio Image Viewer"
  WScript.Quit
End If
Set shortcut = sh.CreateShortcut(fso.BuildPath(root, "Video Audio Image Viewer.lnk"))
shortcut.TargetPath = exe
shortcut.WorkingDirectory = root
shortcut.IconLocation = exe & ",0"
shortcut.Description = "Video Audio Image Viewer"
shortcut.Save
command = Chr(34) & exe & Chr(34)
For Each arg In WScript.Arguments
  command = command & " " & Chr(34) & arg & Chr(34)
Next
sh.CurrentDirectory = root
sh.Run command, 1, False
