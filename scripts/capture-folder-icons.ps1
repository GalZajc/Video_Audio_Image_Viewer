# Development-only capture. The application uses the bundled PNGs on every OS.
# SHGetFileInfoW: https://learn.microsoft.com/windows/win32/api/shellapi/nf-shellapi-shgetfileinfow
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class ViewerFolderIcons {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct Info {
  public IntPtr hIcon; public int index; public uint attributes;
  [MarshalAs(UnmanagedType.ByValTStr,SizeConst=260)] public string displayName;
  [MarshalAs(UnmanagedType.ByValTStr,SizeConst=80)] public string typeName;
 }
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)]
 static extern IntPtr SHGetFileInfoW(string path,uint attributes,out Info info,uint size,uint flags);
 [DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr icon);
 public static void Save(string path,string output,bool generic) {
  Info info;
  var result=SHGetFileInfoW(path,0x10,out info,(uint)Marshal.SizeOf(typeof(Info)),0x100u|(generic?0x10u:0u));
  if(result==IntPtr.Zero||info.hIcon==IntPtr.Zero)throw new Exception("Folder icon unavailable");
  try { using(var icon=Icon.FromHandle(info.hIcon))using(var bitmap=icon.ToBitmap())bitmap.Save(output,ImageFormat.Png); }
  finally {DestroyIcon(info.hIcon);}
 }
}
'@
$assetPath=Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\folders'
[IO.Directory]::CreateDirectory($assetPath)|Out-Null
$shellFolders=Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders'
$folders=@{
 downloads=[Environment]::ExpandEnvironmentVariables($shellFolders.'{374DE290-123F-4565-9164-39C4925E467B}')
 video=[Environment]::GetFolderPath('MyVideos')
 audio=[Environment]::GetFolderPath('MyMusic')
 image=[Environment]::GetFolderPath('MyPictures')
}
[ViewerFolderIcons]::Save('folder', (Join-Path $assetPath 'folder.png'),$true)
foreach($key in $folders.Keys){
 $target=Join-Path $assetPath ($key+'.png')
 if(Test-Path -LiteralPath $folders[$key]){[ViewerFolderIcons]::Save($folders[$key],$target,$false)}
 else{Copy-Item -LiteralPath (Join-Path $assetPath 'folder.png') -Destination $target}
}
Get-ChildItem -LiteralPath $assetPath -Filter '*.png'|Select-Object Name,Length
