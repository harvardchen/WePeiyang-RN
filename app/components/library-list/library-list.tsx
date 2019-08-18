/*
 * Library List
 * Created by Tzingtao Chow
 * ---
 *
 * Library Lists 是显示在主页上的已借阅书籍。
 * 此组件也包含了点击每一本书后出现 Modal 的逻辑。
 *
 */

import * as React from "react"
import { connect } from "react-redux"

import { DeviceEventEmitter, FlatList, View, ViewStyle } from "react-native"
import { LibraryBlock } from "../library-block"
import { Ian } from "../ian"
import Touchable from "react-native-platform-touchable"
import { color, shadowPresets } from "../../theme"
import Modal from "react-native-modal"
import { Text } from "../text"
import { Button } from "../button"
import ss from "./library-list.style"
import { twtGet } from "../../services/twt-fetch"
import { Toasti } from "../toasti"

export interface BookListProps {
  style?: ViewStyle
  compData?
}

class _LibraryList extends React.Component<BookListProps, {}> {
  state = {
    isModalVisible: false,
    userInformed: false,
    bookIndex: 0,
  }

  openModal = () => {
    this.setState({ isModalVisible: true })
  }
  closeModal = () => {
    this.setState({ isModalVisible: false, userInformed: false })
  }

  _keyExtractor = item => String(item.id)

  render() {
    const { style, compData } = this.props

    if (!compData.userInfo.data.accounts.lib) {
      return (
        <View style={[ss.predefinedStyle, style]}>
          <Ian tx="library.notBound" />
        </View>
      )
    }

    if (compData.library.status !== "VALID") {
      return (
        <View style={[ss.predefinedStyle, style]}>
          <Ian tx="data.noAvailableData" />
        </View>
      )
    }

    const data = compData.library.data
    if (data.books.length <= 0) {
      return (
        <View style={[ss.predefinedStyle, style]}>
          <Ian tx="library.noBooks" />
        </View>
      )
    }

    let modal

    let chosenBook = data.books[this.state.bookIndex]
    modal = (
      <Modal
        isVisible={this.state.isModalVisible}
        backdropColor={ss.screen.backgroundColor}
        backdropOpacity={0.9}
        animationIn={"fadeInUp"}
        animationOut={"fadeOutUp"}
        animationInTiming={400}
        animationOutTiming={300}
        backdropTransitionOutTiming={0}
        onBackButtonPress={this.closeModal}
        onBackdropPress={this.closeModal}
        useNativeDriver={true}
        style={ss.modal}
      >
        <View style={[ss.modalCard, shadowPresets.large]}>
          <View>
            <Text text={chosenBook.title} style={ss.bookTitle} selectable={true} />
            <Text text={chosenBook.author} style={ss.bookAuthor} selectable={true} />
          </View>

          <View>
            <View style={ss.bookAttrs}>
              <View style={ss.bookAttrPair}>
                <Text tx="library.callNo" style={ss.bookAttrKey} />
                <Text text={chosenBook.callno} style={ss.bookAttrValue} />
              </View>
              <View style={ss.bookAttrPair}>
                <Text tx="library.type" style={ss.bookAttrKey} />
                <Text text={chosenBook.type} style={ss.bookAttrValue} />
              </View>
              <View style={ss.bookAttrPair}>
                <Text tx="library.location" style={ss.bookAttrKey} />
                <Text text={chosenBook.local} style={ss.bookAttrValue} />
              </View>
              <View style={ss.bookAttrPair}>
                <Text tx="library.borrowedTime" style={ss.bookAttrKey} />
                <Text text={chosenBook.loanTime} style={ss.bookAttrValue} />
              </View>
              <View style={ss.bookAttrPair}>
                <Text tx="library.returnBy" style={ss.bookAttrKey} />
                <Text text={chosenBook.returnTime} style={ss.bookAttrValue} />
              </View>
            </View>
          </View>
        </View>

        <View style={ss.renewArea}>
          {this.state.userInformed && <Text style={ss.renewCaveat} tx="library.renewCaveat" />}
          <Button
            preset="lite"
            style={ss.modalButton}
            onPress={() => {
              if (this.state.userInformed) {
                twtGet(`v1/library/renew${chosenBook.barcode}`)
                  .then(response => response.json())
                  .then(responseJson => {
                    this.closeModal()
                    DeviceEventEmitter.emit("showToast", <Toasti text={responseJson.message} />)
                  })
              } else {
                this.setState({ userInformed: true })
              }
            }}
          >
            <View style={ss.modalButtonContent}>
              <Text
                text={this.state.userInformed ? "check" : "update"}
                preset="i"
                style={ss.modalButtonIcon}
              />
              <Text text=" " preset="h6" />
              <Text
                tx={this.state.userInformed ? "common.confirm" : "library.renew"}
                preset="h6"
                style={{ textTransform: "uppercase" }}
              />
            </View>
          </Button>
        </View>
      </Modal>
    )

    return (
      <View style={[ss.predefinedStyle, style]}>
        {modal}
        <FlatList
          style={ss.listStyle}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          data={data.books}
          keyExtractor={this._keyExtractor}
          renderItem={({ item, index }) => (
            <Touchable
              foreground={Touchable.Ripple(color.background)}
              style={[ss.libraryBlockStyle, shadowPresets.float]}
              delayPressIn={0}
              onPress={() => {
                this.openModal()
                this.setState({ bookIndex: index })
              }}
            >
              <LibraryBlock bookName={item.title} local={item.local} returnTime={item.returnTime} />
            </Touchable>
          )}
        />
      </View>
    )
  }
}

const mapStateToProps = state => {
  return {
    compData: state.dataReducer,
  }
}

const mapDispatchToProps = () => {
  return {}
}

export const LibraryList = connect(
  mapStateToProps,
  mapDispatchToProps,
)(_LibraryList)
