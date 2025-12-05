export const animateSvg = (
  svg: SVGSVGElement,
  opts: { duration: number; loop: boolean },
) => {
  const children = Array.from(svg.children).filter((el) => {
    const tag = el.tagName.toLowerCase();
    return tag !== "defs" && tag !== "style" && tag !== "metadata";
  }) as SVGElement[];

  // Initialize: hide all elements
  children.forEach((el) => {
    el.style.opacity = "0";
  });

  let totalMetric = 0;
  const elementMetrics: number[] = [];

  // Calculate metrics for duration distribution
  children.forEach((el) => {
    let metric = 0;
    const paths = el.querySelectorAll("path");
    if (paths.length > 0) {
      paths.forEach((p) => {
        try {
          metric += p.getTotalLength();
        } catch (e) {
          // ignore
        }
      });
    } else {
      // Estimate for text/image
      metric = 100;
    }
    metric = Math.max(metric, 50);
    elementMetrics.push(metric);
    totalMetric += metric;
  });

  let currentDelay = 0;
  const animations: Animation[] = [];

  children.forEach((el, index) => {
    const metric = elementMetrics[index];
    let duration = (metric / totalMetric) * opts.duration;
    duration = Math.max(duration, 100);

    const paths = Array.from(el.querySelectorAll("path"));
    const hasPaths = paths.length > 0;

    if (hasPaths) {
      // Show element container immediately (but paths are hidden by dashoffset/fill-opacity)
      const showAnim = el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1,
        delay: currentDelay,
        fill: "forwards",
      });
      animations.push(showAnim);

      paths.forEach((path) => {
        let length = 0;
        try {
          length = path.getTotalLength();
        } catch (e) {
          // ignore
        }

        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;

        // Handle fill
        const fill = path.getAttribute("fill") || path.style.fill;
        const hasFill = fill && fill !== "none" && fill !== "transparent";
        if (hasFill) {
          path.style.fillOpacity = "0";
        }

        // Stroke animation
        const strokeAnim = path.animate(
          [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
          {
            duration,
            delay: currentDelay,
            fill: "forwards",
            easing: "ease-out",
          },
        );
        animations.push(strokeAnim);

        // Fill animation (after stroke)
        if (hasFill) {
          const fillAnim = path.animate(
            [{ fillOpacity: 0 }, { fillOpacity: 1 }],
            {
              duration: 300,
              delay: currentDelay + duration * 0.8,
              fill: "forwards",
            },
          );
          animations.push(fillAnim);
        }
      });
      currentDelay += duration;
    } else {
      // Fade in for non-path elements (Text, Image)
      const fadeAnim = el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration,
        delay: currentDelay,
        fill: "forwards",
        easing: "ease-in",
      });
      animations.push(fadeAnim);
      currentDelay += duration;
    }

    // Slight overlap
    currentDelay -= duration * 0.1;
  });

  let timeoutId: any = null;

  const controller = {
    cancel: () => {
      animations.forEach((anim) => anim.cancel());
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    },
    pause: () => {
      animations.forEach((anim) => anim.pause());
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    },
    play: () => {
      animations.forEach((anim) => anim.play());
      // If we were waiting for loop, restart the timer or just rely on finish events?
      // Simple approach: if playing, we assume the user wants to continue.
    },
    seek: (time: number) => {
      animations.forEach((anim) => {
        anim.currentTime = time;
      });
    },
  };

  if (opts.loop) {
    const totalDuration = currentDelay + 1000;
    timeoutId = setTimeout(() => {
      animations.forEach((anim) => anim.cancel());
      // Reset styles
      children.forEach((el) => (el.style.opacity = "0"));
      animateSvg(svg, opts);
    }, totalDuration);
  }

  return controller;
};
