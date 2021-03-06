import { palette } from "./palette"
import configureStore from "../store"
const { store } = configureStore

const white = alpha => `rgba(255,255,255,${alpha})`
const black = alpha => `rgba(0,0,0,${alpha})`

export const color = {
  /**
   * The palette is available to use, but prefer using the name.
   */
  palette,
  /**
   * A helper for making something see-thru. Use sparingly as many layers of transparency
   * can cause older Android devices to slow down due to the excessive compositing required
   * by their under-powered GPUs.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The screen background.
   */
  background: palette.offWhite,
  card: palette.white,
  /**
   * The main tinting color.
   */
  primary: palette.offPale2,
  /**
   * The default color of text in many components.
   */
  text: palette.offPale2,
  /**
   * The main tinting color, but darker.
   */
  lightGrey: palette.lightGrey,
  washed: palette.washed,
  /**
   * A subtle color used for borders and lines.
   */
  line: palette.offWhite,
  /**
   * Secondary information.
   */
  dim: palette.lightGrey,
  /**
   * Error messages and icons.
   */
  error: palette.angry,
  warning: palette.orange,

  /**
   * ColorHashes palette for books & course blocks.
   */
  hash: {
    bookStrip: [palette.washed, palette.lighterPale, palette.lighterAuthenticPale],
  },

  /**
   * Module-specific colors.
   */
  module: () => {
    return {
      gpa: [...store.getState().preferenceReducer.palette.gpa],
      ecard: store.getState().preferenceReducer.palette.ecard,
      yellowPages: store.getState().preferenceReducer.palette.yellowPages,
      schedule: store.getState().preferenceReducer.palette.schedule,
    }
  },

  /**
   * Translucent color generate helpers.
   */
  white: white,
  black: black,
}
