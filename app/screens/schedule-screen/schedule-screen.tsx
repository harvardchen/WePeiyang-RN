/*
 * Schedule Screen
 * Created by Tzingtao Chow
 * ---
 *
 * 这就是整个微北洋 App 中最复杂、最棘手的页面了 —— 是的，课程表页面。
 * 它也是整个 App 中代码行数最多的一个文件 —— 400 多行。
 * 一般情况下，当代码行数超出时，进行 Code Splitting 是常用的建议，
 * 但是就课程表绘制而言，继续 Split 代码会导致整个课程表组件的 Integrity 受损，并制造大量用于连接变量的代码冗余。
 *
 * 它绘制的过程很复杂，以下代码中，我已经尽量在难以理解处添加了注释，并尽量保证命名时完整、可理解的语义。
 * 如果你在尝试阅读它，Best of luck to you。
 *
 */

import * as React from "react"
import { connect } from "react-redux"
import { NavigationScreenProps } from "react-navigation"
import Touchable from "react-native-platform-touchable"
import { format, isSameDay } from "date-fns"
import Modal from "react-native-modal"

import {
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native"

import { Text } from "../../components/text"
import { Screen } from "../../components/screen"
import { TopBar } from "../../components/top-bar"
import { CourseBlockInner } from "../../components/course-block-inner"
import { CourseModal } from "../../components/course-modal"
import { Toasti } from "../../components/toasti"
import { DateIndicator } from "./date-indicator"
import { Dotmap } from "./dotmap"

import {
  dayOffActivities,
  deleteTitle,
  getCalculatedDaysEachWeek,
  getFullSchedule,
  getWeek,
  WEEK_LIMIT,
} from "../../utils/schedule"

import { colorHashByCredits, sanitizeLocation } from "../../utils/common"

import { color, layoutParam } from "../../theme"
import { fetchCourseData, setGeneratedSchedule } from "../../actions/data-actions"
import ss from "./schedule-screen.style"
import { BottomBar } from "./bottom-bar"

export interface ScheduleScreenProps extends NavigationScreenProps<{}> {
  course?
  pref?
  userInfo?
  fetchCourseData?
  setGeneratedSchedule?
}

class _ScheduleScreen extends React.Component<ScheduleScreenProps, {}> {
  state = {
    refreshing: false,
    isModalVisible: false,
    chosenWeek: undefined,
    currentWeek: undefined,
    currentTimestamp: 0,
    windowWidth: Dimensions.get("window").width,
    screenHeight: Dimensions.get("screen").height,
    courseIndex: undefined,
    daysEachWeek: this.props.pref.daysEachWeek,
  }

  componentDidMount = () => {
    let timestamp = new Date(Date.now()).getTime()
    let currentWeek = getWeek(timestamp, this.props.course.data.term_start * 1000)
    if (currentWeek < 1) currentWeek = 1
    if (isNaN(currentWeek)) {
      currentWeek = 1
      DeviceEventEmitter.emit(
        "showToast",
        <Toasti text="Cannot decide current week =(" preset="error" />,
      )
    }
    if (currentWeek > WEEK_LIMIT) currentWeek = WEEK_LIMIT
    this.setState({
      chosenWeek: currentWeek,
      currentWeek: currentWeek,
      currentTimestamp: timestamp,
    }) // ESLint give warning here, but according to React official docs, this pattern is acceptable.
  }

  getNewDimensions = event => {
    this.setState({
      windowWidth: event.nativeEvent.layout.width,
      screenHeight: Dimensions.get("screen").height,
    })
  }

  openModal = () => {
    this.setState({ isModalVisible: true })
  }
  closeModal = () => {
    this.setState({ isModalVisible: false, userInformed: false })
  }

  prepareData = async () => {
    await Promise.all([this.props.fetchCourseData()])
      .then(() => {
        this.props.setGeneratedSchedule(
          getFullSchedule(this.props.course.data, this.state.daysEachWeek),
        )
        DeviceEventEmitter.emit("showToast", <Toasti tx="data.prepareDataSuccess" />)
      })
      .catch(err => {
        console.log(err)
        DeviceEventEmitter.emit("showToast", <Toasti text={err.message} preset="error" />)
      })
  }

  _onRefresh = () => {
    this.setState({ refreshing: true })
    this.prepareData().then(() => {
      this.setState({ refreshing: false })
    })
  }

  _keyExtractor = (item, index) => String(index)

  render() {
    const { course, pref } = this.props
    if (
      !(
        this.state.chosenWeek &&
        this.state.currentWeek &&
        course.status === "VALID" &&
        course.data &&
        course.data.courses
      )
    ) {
      return <Screen />
    }

    const studentId = Number(this.props.userInfo.data.studentid)
    let daysEachWeek =
      this.state.daysEachWeek === "AUTO"
        ? getCalculatedDaysEachWeek(course.data.courses)
        : this.state.daysEachWeek

    let weeks

    if (course.generated && course.generated[0].days.length === daysEachWeek) {
      console.log("Cached branch")
      weeks = course.generated
    } else {
      console.log("Costly branch")
      weeks = getFullSchedule(course.data, daysEachWeek)
      this.props.setGeneratedSchedule(weeks)
    }

    // These are used to calculate the FreeTime Bar Ratio below the schedule.
    let occupied = weeks.reduce((accumulator, week) => accumulator + week.occupiedIndex, 0)
    let TOTAL = weeks.length * 7 * 12

    let days = weeks[this.state.chosenWeek - 1].days

    // For height, you need to specify height of a single components,
    // and the total renderHeight would span
    let timeSlotHeight =
      (this.state.screenHeight * (pref.scheduleHeight || 100)) / ((18 - daysEachWeek) * 100)
    let dateIndicatorHeight = 30
    let timeSlotMargin = 12 - daysEachWeek
    let nTimeSlots = 12
    let renderHeight = (timeSlotHeight + timeSlotMargin) * nTimeSlots + dateIndicatorHeight
    let scheduleRenderHeight = renderHeight - timeSlotMargin - dateIndicatorHeight

    // For width, you need to specify total renderWidth
    let renderWidth = this.state.windowWidth - 2 * layoutParam.paddingHorizontal
    let dayMargin = timeSlotMargin
    let dayWidth = (renderWidth - (daysEachWeek - 1) * dayMargin) / daysEachWeek

    // When styles are strongly connected to programmatic process,
    // usage of inline styles are unavoidable.
    let columns = days.map((day, i) => {
      let crashIndex = 0
      return (
        <View key={i}>
          <DateIndicator
            height={dateIndicatorHeight}
            marginBottom={timeSlotMargin}
            text={format(new Date(day.timestamp), "MM/DD")}
            active={isSameDay(new Date(day.timestamp), new Date(this.state.currentTimestamp))}
          />

          {/*Begin a NOT-THIS-WEEK courses daily schedule column*/}
          {pref.displayNotThisWeek && (
            <View
              style={[
                ss.column,
                {
                  width: dayWidth,
                  height: scheduleRenderHeight,
                  position: "absolute",
                  top: dateIndicatorHeight + timeSlotMargin,
                },
              ]}
            >
              {day.courses
                .filter(c => !c.thisWeek)
                .map((c, j) => {
                  let start = Number(c.activeArrange.start) - 1
                  let end = Number(c.activeArrange.end)
                  let duration = end - start
                  let verticalPosition = start * (timeSlotHeight + timeSlotMargin)
                  return (
                    <View
                      style={{
                        position: "absolute",
                        top: verticalPosition,
                      }}
                      key={j}
                    >
                      <CourseBlockInner
                        style={{
                          width: dayWidth,
                          height: duration * timeSlotHeight + (duration - 1) * timeSlotMargin,
                          alignSelf: "stretch",
                        }}
                        backgroundColor={color.washed}
                        courseName={c.coursename}
                        p1={deleteTitle(c.teacher)}
                        p2={sanitizeLocation(c.activeArrange.room)}
                        notThisWeek
                      />
                    </View>
                  )
                })}
            </View>
          )}
          {/*End a NOT-THIS-WEEK courses schedule column*/}

          {/*Begin a daily schedule column*/}
          <View style={[ss.column, { width: dayWidth, height: scheduleRenderHeight }]}>
            {day.courses.filter(c => c.thisWeek).length > 0 ? (
              day.courses
                .filter(c => c.thisWeek)
                .map((c, j, arr) => {
                  let start = Number(c.activeArrange.start) - 1
                  let end = Number(c.activeArrange.end)
                  let duration = end - start

                  // If detected 2 courses with the same start time, translate the late rendered one
                  let verticalPosition = start * (timeSlotHeight + timeSlotMargin)
                  if (j > 0) {
                    if (arr[j].activeArrange.start === arr[j - 1].activeArrange.start) {
                      crashIndex += 1
                      verticalPosition += crashIndex * 20
                    } else {
                      crashIndex = 0
                    }
                  }
                  return (
                    <Touchable
                      style={{
                        position: "absolute",
                        top: verticalPosition,
                      }}
                      key={j}
                      delayPressIn={0}
                      onPress={() => {
                        this.setState(
                          {
                            courseIndex: [i, j],
                          },
                          () => {
                            this.openModal()
                          },
                        )
                      }}
                      foreground={Touchable.Ripple(color.background)}
                    >
                      <CourseBlockInner
                        style={{
                          width: dayWidth,
                          height: duration * timeSlotHeight + (duration - 1) * timeSlotMargin,
                          alignSelf: "stretch",
                        }}
                        backgroundColor={color.module().schedule[colorHashByCredits(c.credit)]}
                        courseName={c.coursename}
                        p1={deleteTitle(c.teacher)}
                        p2={sanitizeLocation(c.activeArrange.room)}
                      />
                    </Touchable>
                  )
                })
            ) : // Ian and this view here have more differences than styles in common, so plain view.
            pref.displayNotThisWeek ? null : (
              <View style={ss.scheduleIan}>
                <Text
                  style={ss.scheduleIanText}
                  preset="i"
                  text={dayOffActivities(day.timestamp, studentId)}
                />
              </View>
            )}
          </View>
          {/*End a daily schedule column*/}
        </View>
      )
    })

    let modal = <View />

    if (this.state.courseIndex) {
      let idx = this.state.courseIndex
      let chosenCourse = weeks[this.state.chosenWeek - 1].days[idx[0]].courses.filter(
        c => c.thisWeek,
      )[idx[1]]

      modal = (
        <Modal
          isVisible={this.state.isModalVisible}
          backdropColor={ss.screen.backgroundColor}
          hideModalContentWhileAnimating={true}
          animationIn={"fadeInUp"}
          animationOut={"fadeOutUp"}
          animationInTiming={400}
          animationOutTiming={300}
          onBackButtonPress={this.closeModal}
          onBackdropPress={this.closeModal}
          useNativeDriver={true}
          style={ss.modal}
        >
          <CourseModal chosenCourse={chosenCourse} />
        </Modal>
      )
    }

    const dotmapWidth = 10 * daysEachWeek

    return (
      <Screen>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

        {modal}

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh}
              tintColor={color.primary}
              colors={[color.primary]}
            />
          }
        >
          <TopBar
            elements={{
              left: [
                {
                  iconText: "arrow_back",
                  action: () => this.props.navigation.goBack(),
                },
              ],
              right: [
                {
                  iconText: "sync",
                  action: () => this._onRefresh(),
                },
              ],
            }}
            color={color.primary}
          />

          <View style={ss.container} onLayout={this.getNewDimensions}>
            <Text>
              <Text tx="modules.schedule" style={ss.title} preset="h2" />
              <Text text=" " preset="h2" />
              <Text style={ss.titleWeek}>
                <Text tx="schedule.WEEK.pre" />
                <Text text={this.state.chosenWeek} />
                <Text tx="schedule.WEEK.post" />
              </Text>
            </Text>

            <FlatList
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={ss.dotBar}
              data={weeks}
              keyExtractor={this._keyExtractor}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    this.setState({
                      chosenWeek: item.week,
                    })
                  }}
                >
                  <View style={ss.dotmapContainer}>
                    <Dotmap
                      dotColor={color.primary}
                      dotInactiveColor={color.washed}
                      dotSize={6}
                      width={dotmapWidth}
                      height={50}
                      style={ss.dotmap}
                      matrix={item.matrix}
                    />
                    <Text style={ss.dotmapText}>
                      {this.state.currentWeek === item.week && <Text text="• " />}
                      <Text tx="schedule.WEEK.pre" />
                      <Text text={item.week} />
                      <Text tx="schedule.WEEK.post" />
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <View style={[ss.main, { height: renderHeight }]}>{columns}</View>
            <BottomBar ratio={[occupied, TOTAL]} />
          </View>
        </ScrollView>
      </Screen>
    )
  }
}

const mapStateToProps = state => {
  return {
    course: state.dataReducer.course,
    userInfo: state.dataReducer.userInfo,
    pref: state.preferenceReducer,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    fetchCourseData: async () => {
      await dispatch(fetchCourseData())
    },
    setGeneratedSchedule: generated => {
      dispatch(setGeneratedSchedule(generated))
    },
  }
}

export const ScheduleScreen = connect(
  mapStateToProps,
  mapDispatchToProps,
)(_ScheduleScreen)
