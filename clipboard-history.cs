using Windows.Storage.Streams;
public static class ViewerClipboardImage {
 public static DataReader Reader(object raw) {
  var stream=(IRandomAccessStreamWithContentType)raw;
  return new DataReader(stream.GetInputStreamAt(0));
 }
 public static ulong Size(object raw){return ((IRandomAccessStreamWithContentType)raw).Size;}
}