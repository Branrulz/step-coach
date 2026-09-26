# Step Coach

A daily step-goal motivator for **Meta Ray-Ban Display** glasses. Part of the 100 Apps Challenge on Blue Collar to Code.

**Live:** https://branrulz.github.io/step-coach/

- Today's steps with a progress bar toward your goal
- Streak of days you hit your goal
- Nudges like "526 steps to beat yesterday" and pop-ups at every 25% milestone
- Neural Band / D-pad controls: pinch to start or pause, Demo mode to try it without walking
- **Move it:** pinch, hold and drag Step Coach toward any corner of the display and let go; it snaps there and remembers. Without drag: swipe up onto the step panel and pinch to step to the next corner (swipe down to get back to the buttons).

Steps are estimated from head motion and saved only on the device.

## Try it

- **On glasses:** Meta AI app → Devices → Display Glasses settings → App connections → Web apps → Add a web app, then paste the live URL.
- **Demo link:** https://branrulz.github.io/step-coach/?demo opens straight into Demo mode.
- **Look-through preview:** open https://branrulz.github.io/step-coach/preview.html on your phone and tap "Use camera" to see an approximation of the glasses view over the real world (see-through, glowing, lower-right of your view).
- **On a PC:** open the live URL in Chrome with the [Meta Ray-Ban Display Simulator](https://chromewebstore.google.com/detail/meta-ray-ban-display-simu/jpjlmmodokemlepklkdbimceggpbjcll) extension. Arrow keys move focus, Enter selects.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

Built with React, Vite, TypeScript and [UI Toolkit for Meta Ray-Ban Display](https://github.com/facebook/meta-ray-ban-display-ui-toolkit-web). Run `./deploy.sh` to build and publish to GitHub Pages (the `gh-pages` branch).

- `src/steps.ts` – step detection, history, streaks, motivation copy
- `src/useStepCounter.ts` – motion sensor, pause/resume, midnight rollover, saving
- `src/App.tsx` – the glasses screen

## Privacy

Steps and settings stay on the device; nothing is sent anywhere. Full policy: https://branrulz.github.io/step-coach/privacy.html
