function quality() {
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 760
    || window.matchMedia("(pointer: coarse)").matches;
  const dprCap = mobile ? 1.25 : 1.6;
  return {
    mobile,
    dpr: Math.min(dprCap, window.devicePixelRatio || 1),
    stars: mobile ? 70 : 180,
    segments: mobile ? [20, 4] : [42, 6],
    shadows: !mobile,
    bloom: !mobile,
  };
}

function webglOk() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch (err) {
    return false;
  }
}

export async function startStudio() {
  if (!webglOk()) return null;
  const level = quality();
  const bookCanvas = document.getElementById("book-gl");
  const skyCanvas = document.getElementById("starfield");
  if (!bookCanvas || !skyCanvas) return null;
  if (document.fonts?.load) {
    await Promise.race([
      Promise.all([
        document.fonts.load("500 72px Fraunces"),
        document.fonts.load("500 64px 'Noto Serif SC'"),
      ]),
      new Promise((resolve) => { window.setTimeout(resolve, 1200); }),
    ]);
  }
  const [{ mountBook }, { mountSky }] = await Promise.all([
    import("./book.js"),
    import("./sky.js"),
  ]);
  let book = null;
  let sky = null;
  try {
    book = await mountBook(bookCanvas, level);
  } catch (err) {
    book = null;
  }
  try {
    sky = mountSky(skyCanvas, level);
  } catch (err) {
    sky = null;
  }
  if (!book && !sky) return null;
  if (book) document.documentElement.classList.add("gl");
  return { book, sky, level };
}
