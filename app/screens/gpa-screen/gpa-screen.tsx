import * as React from "react"
import { connect } from "react-redux"

import { Animated, FlatList, RefreshControl, ScrollView, StatusBar, TouchableOpacity, View } from "react-native"
import { Screen } from "../../components/screen"
import { color } from "../../theme"
import { NavigationScreenProps } from "react-navigation"
import { setGpaOrderBy, setScoreType, setSemesterIndex } from "../../actions/preference-actions"
import { fetchGpaData } from "../../actions/data-actions"
import { connectedGpaCurve as GpaCurve } from "../../components/gpa-curve"
import { digitsFromScoreType } from "../../utils/common"
import { GpaStat } from "../../components/gpa-stat/gpa-stat"
import ss from "./gpa-screen.style"
import { connectedGpaRadar as GpaRadar } from "../../components/gpa-radar"
import { GpaSnack } from "./gpa-snack"

import { Text } from "../../components/text"
import Toast from "react-native-root-toast"
import toastOptions from "../../theme/toast"
import { TopBar } from "./top-bar"

import Modal from "react-native-modal"
import { Button } from "../../components/button"
import { GpaInfo } from "./gpa-info"

export interface GpaScreenProps extends NavigationScreenProps<{}> {

  scoreType?
  setScoreType?

  gpa?
  fetchGpaData?

  semesterIndex?

  gpaOrderBy?
  setGpaOrderBy?

}

export class GpaScreen extends React.Component<GpaScreenProps, {}> {

  state = {
    refreshing: false,
    isModalVisible: false,
    renderChart: false, // Defer chart render for better entry performance
    fadeAnim: new Animated.Value(0),
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({ renderChart: true })
      Animated.timing(
        this.state.fadeAnim,
        {
          toValue: 1, // Animate to opacity: 1 (opaque)
          duration: 1000, // Make it take a while
        }
      ).start()
    }, 1)
  }

  prepareData = async () => {
    await Promise.all([
      this.props.fetchGpaData()
    ]).then((values) => {
      Toast.show(<Text tx="gpaScreen.prepareDataSuccess" style={{ color: toastOptions.gpa.textColor }}/> as any, toastOptions.gpa)
      console.log(values)
    }).catch((err) => {
      console.log(err)
      Toast.show(<Text tx="gpaScreen.prepareDataFailed" style={{ color: toastOptions.err.textColor }}/> as any, toastOptions.err)
    })
  }

  toggleOrderType = () => {
    let current = this.props.gpaOrderBy
    switch (current) {
      case "credits":
        this.props.setGpaOrderBy("name")
        break
      case "name":
        this.props.setGpaOrderBy("score")
        break
      case "score":
        this.props.setGpaOrderBy("credits")
        break
    }
  }

  toggleModal = () => {
    this.setState({ isModalVisible: !this.state.isModalVisible })
  }

  _onRefresh = () => {
    this.setState({ refreshing: true })
    this.prepareData().then(() => {
      this.setState({ refreshing: false })
    })
  }

  _keyExtractor = (item) => String(item.no);

  render () {

    const { gpa, scoreType, setScoreType, semesterIndex } = this.props

    // data for GpaStat component
    let semestralStat = {}
    for (let key in gpa.data.gpaSemestral) {
      semestralStat[key] = gpa.data.gpaSemestral[key][semesterIndex].y.toFixed(digitsFromScoreType(key))
    }

    let sortedScores = [...gpa.data.gpaDetailed[semesterIndex].data].sort((courseA, courseB) => {
      switch (this.props.gpaOrderBy) {
        case "credits":
          return courseA.credit < courseB.credit ? 1 : -1
        case "name":
          return courseA.name.localeCompare(courseB.name, "zh")
        case "score":
          return courseA.score < courseB.score ? 1 : -1
      }
      Toast.show(<Text text="Sort failed: Unknown sorting key. Please check your code spelling." style={{ color: toastOptions.err.textColor }}/> as any, toastOptions.err)
      return 1
    })

    return (
      <Screen style={ss.screen}>

        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle='light-content'
        />

        <Modal
          isVisible={this.state.isModalVisible}
          backdropColor={ss.screen.backgroundColor}
          onBackButtonPress={this.toggleModal}
          onBackdropPress={this.toggleModal}
          useNativeDriver={true}
        >
          <ScrollView
            style={ss.modal}
            contentContainerStyle={ss.gpaInfoContent}
            showsVerticalScrollIndicator={false}
          >
            <GpaInfo/>
            <Button text="Close" onPress={this.toggleModal} />
          </ScrollView>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={
          <RefreshControl
            refreshing={this.state.refreshing}
            onRefresh={this._onRefresh}
          />
        } >

          <TopBar actions={[
            () => this.props.navigation.goBack(),
            this.toggleModal,
            this._onRefresh
          ]}/>

          <Animated.View style={{ ...ss.radarContainer, opacity: this.state.fadeAnim }}>
            {(this.state.renderChart) && (
              <GpaRadar />
            )}
          </Animated.View>

          <View style={ss.container}>

            <GpaStat
              style={ss.stat}
              status={gpa.status}
              setScoreType={(scoreType) => setScoreType(scoreType)}
              scores={semestralStat}
              txs={["gpa.semestralWeighted", "gpa.semestralGpa", "gpa.semestralCredits"]}
              palette={[ color.module.gpa[2], color.module.gpa[1]]}
            />

            <GpaCurve
              style={ss.curve}
              data={gpa.data.gpaSemestral[scoreType]}
              status={gpa.status}
              scoreToFixed={digitsFromScoreType(scoreType)}
              animated={false}
              palette={[color.module.gpa[3], color.module.gpa[1], color.module.gpa[3], color.module.gpa[1], color.module.gpa[0]]}
            />

            <View style={ss.orderTab}>
              <TouchableOpacity style={ss.orderTouchable} onPress={this.toggleOrderType}>
                <View style={ss.orderTexts}>
                  <Text text="shuffle" preset="i" style={ss.orderIcon}/>
                  <Text text="ORDERED BY" preset="lausanne" style={ss.orderTextPrefix}/>
                  <Text text={this.props.gpaOrderBy} preset="lausanne" style={ss.orderTextSuffix}/>
                </View>
              </TouchableOpacity>
            </View>

            <FlatList
              style={ss.list}
              contentContainerStyle={ss.listContainer}
              data={sortedScores}
              keyExtractor={this._keyExtractor}
              renderItem={({ item }) => (
                <GpaSnack
                  style={ss.snackStyle}
                  score={item['score']}
                  courseName={item['name']}
                  courseType={item['classType']}
                  credits={item['credit']}
                />
              )}
            />

          </View>
        </ScrollView>
      </Screen>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    scoreType: state.preferenceReducer.scoreType,
    gpaOrderBy: state.preferenceReducer.gpaOrderBy,
    gpa: state.dataReducer.gpa,
    semesterIndex: state.semesterReducer
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setScoreType: (newType) => {
      dispatch(setScoreType(newType))
    },
    setSemesterIndex: (newType) => {
      dispatch(setSemesterIndex(newType))
    },
    fetchGpaData: async () => {
      await dispatch(fetchGpaData())
    },
    setGpaOrderBy: (newType) => {
      dispatch(setGpaOrderBy(newType))
    }
  }
}

export const connectedGpaScreen = connect(mapStateToProps, mapDispatchToProps)(GpaScreen)
export default connectedGpaScreen
