# Puff Note Project Brief

Puff Note is a mobile first web prototype.

The user flow is:

Landing page
→ Pick mood
→ Start capturing
→ Open phone video camera
→ Draw a trace with finger on top of the camera view
→ Capture the current frame
→ Apply selected mood finish
→ Save as image/poster

Important MVP decision:
The first version uses touch drawing over the live camera view.
Do not implement MediaPipe or true air gesture tracking yet.
True hand tracking can come later.

Core screens:
1. Landing page
2. Mood selection
3. Camera capture screen
4. Poster preview
5. Export image flow

Primary user:
A creative user who wants to capture a real sky/cloud moment, add a hand drawn trace, select a mood, and create a soft poster to send or save.

The product should preserve the real world background.
Mood finish should gently enhance the image, not replace it.

Success criteria:
1. The landing page looks visually aligned with Puff Note direction.
2. Mood bubbles are tactile and beautiful.
3. Camera opens on mobile.
4. User can draw with finger over camera.
5. Capture freezes frame and trace.
6. Poster preview shows background, trace, mood overlay, copy, and mood label.
7. Save poster exports PNG.