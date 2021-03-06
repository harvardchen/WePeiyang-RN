/*
 * Root Navigator
 * Created by Tzingtao Chow
 * ---
 *
 * 根导航器。这是 App 启动会使用的第一个导航器，
 * 它会先检查用户的登录状态，然后选择跳转到主页还是登录页。
 *
 */

import { createSwitchNavigator } from "react-navigation"
import { LoginScreen } from "../screens/login-screen"
import { AppNavigator } from "./app-navigator"
import { AuthLoadingScreen } from "../screens/auth-loading-screen"

export const RootNavigator = createSwitchNavigator(
  {
    app: AppNavigator,
    authLoading: AuthLoadingScreen,
    login: LoginScreen,
  },
  {
    initialRouteName: "authLoading",
  },
)
