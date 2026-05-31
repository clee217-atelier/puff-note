# Puff Note Technical Plan

Stack:
Next.js App Router
React
TypeScript
Tailwind CSS
html-to-image for poster export

No backend.
No database.
No authentication.

Core state:
selectedMood
currentStep
cameraStream
capturedImage
drawingDataUrl
cameraError

Suggested components:
AppShell
LandingPage
MoodBubble
MoodPicker
CameraCapture
DrawingCanvas
PosterPreview
ExportPosterButton

Camera:
Use navigator.mediaDevices.getUserMedia.
Use facingMode environment when available.
Video element must use playsInline, muted, autoPlay.
Stop all camera tracks on unmount.
Show fallback sky image if camera fails.

Drawing:
Use canvas overlay positioned absolute over the video.
Support touch and mouse events.
Prevent page scroll while drawing.
Use round line caps and smooth curves.
Clear button clears canvas only.

Capture:
Use an offscreen canvas.
Draw current video frame.
Export video frame as image data URL.
Export trace canvas as transparent PNG data URL.
Move to poster preview.

Poster:
Compose poster as DOM node.
Background is captured image.
Trace image overlays background.
Mood overlay is a semi transparent layer.
Text overlays include brand, date, caption, footer, mood label.
Export poster node to PNG using html-to-image.

Poster copy:
Calm: A little quieter today.
Dreamy: A little lighter today.
Reflective: Some thoughts need space.
Soft: Not everything needs a reason.
Curious: Follow what drifts.

Footer:
NOTED IN A MOMENT · FELT FOR LONGER