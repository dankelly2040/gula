internal import ExpoModulesCore
import UIKit
import Vision
import CoreImage

/**
 * Lifts the main subject (the slice) out of a photo with Vision's foreground
 * instance mask (iOS 17+). Returns an upright copy of the photo, a PNG cutout
 * cropped to the subject on a transparent background, and the subject's
 * bounding box normalised to the upright photo. `cutoutUri` is nil when Vision
 * finds no subject, so callers fall back to the full photo.
 */
class SubjectLiftModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SubjectLiftModule")

    AsyncFunction("liftSubject") { (uri: String) -> [String: Any?] in
      guard let url = URL(string: uri),
            let data = try? Data(contentsOf: url),
            let raw = UIImage(data: data) else {
        throw LiftError.unreadable(uri)
      }
      let upright = raw.uprightCopy()
      guard let cg = upright.cgImage else { throw LiftError.unreadable(uri) }

      let dir = FileManager.default.temporaryDirectory
      let base = "slice-lift-\(UUID().uuidString)"
      let photoURL = dir.appendingPathComponent("\(base).jpg")
      try upright.jpegData(compressionQuality: 0.9)?.write(to: photoURL)

      var result: [String: Any?] = [
        "photoUri": photoURL.absoluteString,
        "width": cg.width,
        "height": cg.height,
        "cutoutUri": nil,
        "box": nil,
        "error": nil,
      ]

      let request = VNGenerateForegroundInstanceMaskRequest()
      let handler = VNImageRequestHandler(cgImage: cg, options: [:])
      do {
        try handler.perform([request])
      } catch {
        // Surface why (the simulator may not run this model) instead of silently falling back.
        result["error"] = "vision: \(error.localizedDescription)"
        return result
      }
      guard let observation = request.results?.first,
            !observation.allInstances.isEmpty else {
        result["error"] = "vision: no foreground instances"
        return result
      }

      let mask = try observation.generateScaledMaskForImage(
        forInstances: observation.allInstances, from: handler)
      guard let box = SubjectLiftModule.boundingBox(of: mask) else { return result }

      let cutout = try observation.generateMaskedImage(
        ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: true)
      let cutoutURL = dir.appendingPathComponent("\(base)-cutout.png")
      let ci = CIImage(cvPixelBuffer: cutout)
      try CIContext().writePNGRepresentation(
        of: ci, to: cutoutURL, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())

      result["cutoutUri"] = cutoutURL.absoluteString
      result["box"] = ["x": box.minX, "y": box.minY, "width": box.width, "height": box.height]
      return result
    }
  }

  /// Normalised bounding box of mask pixels above 0.5, sampling every 4th pixel.
  static func boundingBox(of mask: CVPixelBuffer) -> CGRect? {
    CVPixelBufferLockBaseAddress(mask, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(mask) else { return nil }
    let width = CVPixelBufferGetWidth(mask)
    let height = CVPixelBufferGetHeight(mask)
    let bytesPerRow = CVPixelBufferGetBytesPerRow(mask)
    let isFloat = CVPixelBufferGetPixelFormatType(mask) == kCVPixelFormatType_OneComponent32Float
    let step = 4
    var minX = Int.max, minY = Int.max, maxX = -1, maxY = -1
    for y in Swift.stride(from: 0, to: height, by: step) {
      let row = base.advanced(by: y * bytesPerRow)
      for x in Swift.stride(from: 0, to: width, by: step) {
        let on = isFloat
          ? row.load(fromByteOffset: x * 4, as: Float.self) > 0.5
          : row.load(fromByteOffset: x, as: UInt8.self) > 127
        if on {
          minX = min(minX, x); maxX = max(maxX, x)
          minY = min(minY, y); maxY = max(maxY, y)
        }
      }
    }
    guard maxX >= 0 else { return nil }
    let w = CGFloat(width), h = CGFloat(height)
    return CGRect(
      x: CGFloat(minX) / w, y: CGFloat(minY) / h,
      width: CGFloat(maxX - minX + step) / w, height: CGFloat(maxY - minY + step) / h)
  }
}

enum LiftError: Error {
  case unreadable(String)
}

private extension UIImage {
  /// Redraw so the pixel data is upright; camera JPEGs carry orientation in EXIF only.
  func uprightCopy() -> UIImage {
    if imageOrientation == .up { return self }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      draw(in: CGRect(origin: .zero, size: size))
    }
  }
}
