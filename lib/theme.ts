export const THEME_KEY = "tracetalk:theme";

/** Runs before paint (inlined in <head>) so a saved theme never flashes. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
