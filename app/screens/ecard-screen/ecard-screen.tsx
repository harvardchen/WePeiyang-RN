import * as React from "react"
import { connect } from "react-redux"
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native"
import Color from 'color'
import { Screen } from "../../components/screen"
import { color, layoutParam } from "../../theme"
import { NavigationScreenProps } from "react-navigation"
import { connectedEcardBlock as EcardBlock } from "../../components/ecard-block"
import { TopBar } from "./top-bar"
import Toast from "react-native-root-toast"
import { Text } from "../../components/text"
import toastOptions from "../../theme/toast"
import { fetchEcardProfile, fetchEcardTurnover } from "../../actions/data-actions"
import { EcardSnack } from "./ecard-snack"

export interface EcardScreenProps extends NavigationScreenProps<{}> {
  ecard?
  fetchEcardProfile?
  fetchEcardTurnover?
}

const ss = {
  screen: {
    backgroundColor: color.module.ecard,
  } as ViewStyle,
  container: {
    paddingHorizontal: layoutParam.paddingHorizontal,
    paddingBottom: layoutParam.paddingVertical
  } as ViewStyle,
  list: {
  } as ViewStyle,
  listContainer: {
    alignItems: "center",
  } as ViewStyle,
  snackStyle: {

  } as ViewStyle,

  loadMoreTouchable: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  } as ViewStyle,
  loadMoreText: {
    color: color.white(1),
  } as TextStyle,
  loadMoreIcon: {
    color: color.white(1),
    marginRight: 10,
  } as TextStyle,

}

export class EcardScreen extends React.Component<EcardScreenProps, {}> {

  state = {
    refreshing: false,
    daysToLoad: 2,
  }

  prepareData = async () => {
    await Promise.all([
      this.props.fetchEcardProfile(this.props.ecard.auth.cardId, this.props.ecard.auth.password),
      this.props.fetchEcardTurnover(this.props.ecard.auth.cardId, this.props.ecard.auth.password, this.state.daysToLoad)
    ]).then((values) => {
      Toast.show(<Text tx="ecardScreen.prepareDataSuccess" style={{ color: toastOptions.ecard.textColor }}/> as any, toastOptions.ecard)
      console.log(values)
    }).catch((err) => {
      console.log(err)
      Toast.show(<Text tx="ecardScreen.prepareDataFailed" style={{ color: toastOptions.err.textColor }}/> as any, toastOptions.err)
    })
  }

  _onRefresh = () => {
    this.setState({ refreshing: true })
    this.prepareData().then(() => {
      this.setState({ refreshing: false })
    })
  }

  _keyExtractor = (item, index) => String(index);

  _loadMore = async () => {
    this.setState({ daysToLoad: this.state.daysToLoad + 1 })
    this.setState({ refreshing: true })
    await Promise.all([
      this.props.fetchEcardTurnover(this.props.ecard.auth.cardId, this.props.ecard.auth.password, this.state.daysToLoad)
    ]).then(() => {
      this.setState({ refreshing: false })
    }).catch((err) => {
      this.setState({ refreshing: false })
      console.log(err)
      Toast.show(<Text tx="ecardScreen.prepareDataFailed" style={{ color: toastOptions.err.textColor }}/> as any, toastOptions.err)
    })
  }

  render () {

    const { ecard } = this.props
    console.log(ecard)

    return (

      <Screen style={ss.screen}>
        <StatusBar
          translucent
          backgroundColor={"transparent"}
          barStyle='light-content'
        />

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={
          <RefreshControl
            refreshing={this.state.refreshing}
            onRefresh={this._onRefresh}
          />
        } >

          <TopBar actions={[
            () => this.props.navigation.goBack(),
            () => {},
            this._onRefresh
          ]}/>

          <View style={ss.container}>
            <EcardBlock palette={[Color(color.module.ecard).lighten(0.1).string(), color.background, color.background]}/>

            <FlatList
              style={ss.list}
              contentContainerStyle={ss.listContainer}
              data={ecard.turnover}
              keyExtractor={this._keyExtractor}
              renderItem={({ item }) => (
                <EcardSnack
                  style={ss.snackStyle}
                  location={item['location']}
                  amount={item['amount']}
                  date={item['date']}
                  time={item['date']}
                  type={item['type']}
                  subType={item['sub_type']}
                />
              )}
            />

            <TouchableOpacity
              style={ss.loadMoreTouchable}
              onPress={this._loadMore}
            >
              <Text text="more_horiz" preset="i" style={ss.loadMoreIcon}/>
              <Text text="Load One More Day" style={ss.loadMoreText} preset="lausanne"/>
            </TouchableOpacity>

          </View>

        </ScrollView>

      </Screen>

    )
  }
}

const mapStateToProps = (state) => {
  return {
    ecard: state.dataReducer.ecard
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    fetchEcardProfile: async (cardId, password) => {
      await dispatch(fetchEcardProfile(cardId, password))
    },
    fetchEcardTurnover: async (cardId, password, days) => {
      await dispatch(fetchEcardTurnover(cardId, password, days))
    },
  }
}

export const connectedEcardScreen = connect(mapStateToProps, mapDispatchToProps)(EcardScreen)
