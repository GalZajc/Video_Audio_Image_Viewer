// Runs OneOCR from the user's installed Microsoft Snipping Tool in an isolated,
// persistent process. No Microsoft model/DLL is redistributed with this project.
// ABI references: https://github.com/AuroraWright/oneocr (MIT),
// https://github.com/b1tg/win11-oneocr . No recognition/angle heuristics are applied.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;

public sealed class ViewerOcr : IDisposable {
 [StructLayout(LayoutKind.Sequential)] struct ImageData { public int type,width,height,reserved; public long stride; public IntPtr data; }
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long Create(out IntPtr value);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long SetByte(IntPtr value,byte option);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long SetLong(IntPtr value,long option);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long Pipeline(IntPtr model,IntPtr key,IntPtr options,out IntPtr value);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long Run(IntPtr pipeline,ref ImageData image,IntPtr options,out IntPtr value);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long GetPointer(IntPtr value,out IntPtr result);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long GetCount(IntPtr value,out long result);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long GetAt(IntPtr value,long index,out IntPtr result);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate long GetFloat(IntPtr value,out float result);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate void Release(IntPtr value);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr LoadLibraryExW(string path,IntPtr file,uint flags);
 [DllImport("kernel32.dll",CharSet=CharSet.Ansi)] static extern IntPtr GetProcAddress(IntPtr module,string name);
 [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr module);
 IntPtr library,init,pipeline,options; Run run; GetCount lineCount,wordCount; GetAt lineAt,wordAt;
 GetPointer lineText,wordText,wordBox; GetFloat confidence; Release releaseInit,releasePipeline,releaseOptions,releaseResult;
 T Function<T>(string name) where T:class { var address=GetProcAddress(library,name);if(address==IntPtr.Zero)throw new Exception("OneOCR export missing: "+name);return (T)(object)Marshal.GetDelegateForFunctionPointer(address,typeof(T)); }
 static void Check(long code,string operation="request"){if(code!=0)throw new Exception("OneOCR "+operation+" returned "+code);}
 static IntPtr Utf8(string text){var bytes=Encoding.UTF8.GetBytes(text+'\0');var p=Marshal.AllocHGlobal(bytes.Length);Marshal.Copy(bytes,0,p,bytes.Length);return p;}
 static string Text(IntPtr handle,GetPointer getter){IntPtr p;Check(getter(handle,out p));if(p==IntPtr.Zero)return "";int n=0;while(Marshal.ReadByte(p,n)!=0){if(++n>1000000)throw new Exception("OneOCR text exceeds limit");}var bytes=new byte[n];Marshal.Copy(p,bytes,0,n);return Encoding.UTF8.GetString(bytes);}
 public ViewerOcr(string directory,int maximumLines){
  // LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_DEFAULT_DIRS confines
  // dependency lookup to the installed package and normal trusted system paths.
  library=LoadLibraryExW(Path.Combine(directory,"oneocr.dll"),IntPtr.Zero,0x1100);
  if(library==IntPtr.Zero)throw new Exception("Unable to load installed Snipping Tool OCR: "+Marshal.GetLastWin32Error());
  releaseInit=Function<Release>("ReleaseOcrInitOptions");releasePipeline=Function<Release>("ReleaseOcrPipeline");releaseOptions=Function<Release>("ReleaseOcrProcessOptions");releaseResult=Function<Release>("ReleaseOcrResult");
  Check(Function<Create>("CreateOcrInitOptions")(out init),"CreateOcrInitOptions");Check(Function<SetByte>("OcrInitOptionsSetUseModelDelayLoad")(init,0),"OcrInitOptionsSetUseModelDelayLoad");
  var modelPath=Path.Combine(directory,"oneocr.onemodel");
  var model=Utf8(modelPath);var key=Utf8("kj)TGtrK>f]b[Piow.gU+nC@s"+new string('"',6)+"4");
  try{Check(Function<Pipeline>("CreateOcrPipeline")(model,key,init,out pipeline),"CreateOcrPipeline");}finally{Marshal.FreeHGlobal(model);Marshal.FreeHGlobal(key);}
  Check(Function<Create>("CreateOcrProcessOptions")(out options),"CreateOcrProcessOptions");Check(Function<SetLong>("OcrProcessOptionsSetMaxRecognitionLineCount")(options,maximumLines),"OcrProcessOptionsSetMaxRecognitionLineCount");
  run=Function<Run>("RunOcrPipeline");lineCount=Function<GetCount>("GetOcrLineCount");wordCount=Function<GetCount>("GetOcrLineWordCount");lineAt=Function<GetAt>("GetOcrLine");wordAt=Function<GetAt>("GetOcrWord");lineText=Function<GetPointer>("GetOcrLineContent");wordText=Function<GetPointer>("GetOcrWordContent");wordBox=Function<GetPointer>("GetOcrWordBoundingBox");confidence=Function<GetFloat>("GetOcrWordConfidence");
 }
 public object Recognize(string input,int maximumDimension,int maximumPixels){
  var watch=Stopwatch.StartNew();using(var original=new Bitmap(input)){
   double scale=Math.Min(1,Math.Min(maximumDimension/(double)Math.Max(original.Width,original.Height),Math.Sqrt(maximumPixels/((double)original.Width*original.Height))));
   int width=Math.Max(50,(int)Math.Round(original.Width*scale)),height=Math.Max(50,(int)Math.Round(original.Height*scale));
   using(var bitmap=new Bitmap(width,height,PixelFormat.Format32bppArgb)){
    using(var g=Graphics.FromImage(bitmap)){g.Clear(Color.White);g.DrawImage(original,new Rectangle(0,0,(int)Math.Round(original.Width*scale),(int)Math.Round(original.Height*scale)));}
    var locked=bitmap.LockBits(new Rectangle(0,0,width,height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);IntPtr result=IntPtr.Zero;
    try{
     var image=new ImageData{type=3,width=width,height=height,stride=locked.Stride,data=locked.Scan0};Check(run(pipeline,ref image,options,out result));long count;Check(lineCount(result,out count));var lines=new List<object>();var texts=new List<string>();
     for(long i=0;i<count;i++){
      IntPtr line;Check(lineAt(result,i,out line));long wordsCount;Check(wordCount(line,out wordsCount));var words=new List<object>();
      for(long j=0;j<wordsCount;j++){
       IntPtr word,box;Check(wordAt(line,j,out word));var text=Text(word,wordText);if(String.IsNullOrWhiteSpace(text))continue;Check(wordBox(word,out box));if(box==IntPtr.Zero)continue;
       var coords=new float[8];Marshal.Copy(box,coords,0,8);var polygon=new List<object>();var xs=new List<double>();var ys=new List<double>();
       for(int k=0;k<8;k+=2){double x=coords[k]/scale,y=coords[k+1]/scale;polygon.Add(new{x,y});xs.Add(x);ys.Add(y);}
       float probability;Check(confidence(word,out probability));words.Add(new{text,x=xs.Min(),y=ys.Min(),width=xs.Max()-xs.Min(),height=ys.Max()-ys.Min(),polygon,confidence=probability});
      }
      if(words.Count>0){var text=Text(line,lineText);lines.Add(new{text,words});texts.Add(text);}
     }
     return new{width=original.Width,height=original.Height,lines,text=String.Join("\n",texts),engine="oneocr",analysis=new{milliseconds=watch.ElapsedMilliseconds,passes=1,scale}};
    }finally{if(result!=IntPtr.Zero)releaseResult(result);bitmap.UnlockBits(locked);}
   }
  }
 }
 public void Dispose(){if(options!=IntPtr.Zero)releaseOptions(options);if(pipeline!=IntPtr.Zero)releasePipeline(pipeline);if(init!=IntPtr.Zero)releaseInit(init);if(library!=IntPtr.Zero)FreeLibrary(library);options=pipeline=init=library=IntPtr.Zero;}
 public static int Main(string[] args){
  Console.InputEncoding=new UTF8Encoding(false);Console.OutputEncoding=new UTF8Encoding(false);var json=new JavaScriptSerializer{MaxJsonLength=32*1024*1024};ViewerOcr worker=null;
  try{
   var init=json.Deserialize<Dictionary<string,object>>(Console.ReadLine());
   if(init.ContainsKey("cpuThreads")&&Convert.ToInt32(init["cpuThreads"])>0){var process=Process.GetCurrentProcess();long available=process.ProcessorAffinity.ToInt64(),selected=0;int remaining=Convert.ToInt32(init["cpuThreads"]);for(int i=0;i<63&&remaining>0;i++)if((available&(1L<<i))!=0){selected|=1L<<i;remaining--;}if(selected!=0)process.ProcessorAffinity=new IntPtr(selected);}
   var watch=Stopwatch.StartNew();worker=new ViewerOcr((string)init["directory"],Convert.ToInt32(init["maximumLines"]));
   Console.WriteLine(json.Serialize(new{ready=true,milliseconds=watch.ElapsedMilliseconds}));string line;
   while((line=Console.ReadLine())!=null){object id=null;try{var request=json.Deserialize<Dictionary<string,object>>(line);id=request["id"];var result=worker.Recognize((string)request["path"],Convert.ToInt32(init["maximumDimension"]),Convert.ToInt32(init["maximumPixels"]));Console.WriteLine(json.Serialize(new{id,result}));}catch(Exception error){Console.WriteLine(json.Serialize(new{id,error=error.Message}));}}
   return 0;
  }catch(Exception error){Console.WriteLine(json.Serialize(new{error=error.Message}));return 1;}finally{if(worker!=null)worker.Dispose();}
 }
}
