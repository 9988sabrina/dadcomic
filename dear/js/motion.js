let reduce = false;
let booted = false;

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initMotion() {
  reduce = reduced();
  if (reduce || booted) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Lenis = window.Lenis;
  if (!gsap || !ScrollTrigger || !Lenis) return;
  booted = true;
  gsap.registerPlugin(ScrollTrigger);
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.documentElement.classList.add("has-motion");

  gsap.from("#hero-cover", {
    y: 36,
    duration: 1.2,
    ease: "power3.out",
  });
  gsap.to("#hero-cover", {
    yPercent: 8,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
  const line = document.querySelector(".overture-line");
  if (line) {
    gsap.from(line, {
      y: 28,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: { trigger: line, start: "top 80%" },
    });
  }
}

export function revealCards() {
  if (reduced() || !window.gsap || !window.ScrollTrigger) return;
  const gsap = window.gsap;
  window.ScrollTrigger.getAll().forEach((st) => {
    if (st.vars && st.vars.id && String(st.vars.id).startsWith("card-")) st.kill();
  });
  gsap.utils.toArray("#wall-cards .panel").forEach((el, i) => {
    gsap.from(el, {
      y: 22,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        id: `card-${i}-${el.dataset.id || i}`,
        trigger: el,
        start: "top 90%",
        once: true,
      },
    });
  });
}
