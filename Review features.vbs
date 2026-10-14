Option Explicit
Dim sh, fs, root, exe, command
Set sh = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
root = fs.GetParentFolderName(WScript.ScriptFullName)
exe = fs.BuildPath(root, "app\Video Audio Image Viewer-win32-x64\VideoAudioImageViewer.exe")
If Not fs.FileExists(exe) Then
    MsgBox "First build Video Audio Image Viewer.", 16, "Feature review"
    WScript.Quit 1
End If
sh.Environment("Process")("ELECTRON_RUN_AS_NODE") = "1"
command = Chr(34) & exe & Chr(34) & " " & Chr(34) & fs.BuildPath(root, "scripts\review-server.js") & Chr(34)
sh.Run command, 0, False
