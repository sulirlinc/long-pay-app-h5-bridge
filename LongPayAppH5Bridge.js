(() => {
  const isLongPay = function () {
    return !!window.navigator.userAgent.match(/LongPay/i)
  }
  const getLanguage = function () {
    return ((window.navigator.userAgent).match(
        /Accept-Language: ([-\w]+)/) || ([ '', 'en-US' ]))[1];
  }
  const postMessage = function (data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data))
    }
  }
  const events = {
    onListener: {},
    call(action, data) {
      if (typeof this.onListener[action] === 'function') {
        this.onListener[action](data)
      }
    },
  }

  const PageController = (() => {
    const isAndroid = !!navigator.userAgent.match(/Android/i)
    const hardwareBackPressConfig = {
      type: 'hardwareBackPress',
      isChild: false,
      disabled: false,
      objHardwareBackPress: null,
    }
    const mapHardwareBackPressListener = {}
    const listHardwareBackPressListener = []
    const rtn = {
      ...events,
      isAndroid,
      /**
       * 监听LongPay的返回事件，H5可返回到上级页面
       * 注意：仅Android 且 设置setHardwareBackPress(false, true)或setSlideOutStatus(true)生效
       */
      setOnHardwareBackPressListener(listener) {
        hardwareBackPressConfig.objHardwareBackPress = listener
        //  rtn.onListener['hardwareBackPress'] = listener
      },
      addHardwareBackPressListener({ name, listener }) {
        if (name) {
          mapHardwareBackPressListener[name] = listener
        } else {
          listHardwareBackPressListener.push(listener)
        }
        return () => {
          if (rtn.listHardwareBackPressListener.length > 0) {
            const k = []
            for (const element of rtn.listHardwareBackPressListener) {
              if (listener === element) {
                break
              }
              k.push(element)
            }
            rtn.listHardwareBackPressListener = k
          }
        }
      },
      removeHardwareBackPressListener(name) {
        delete mapHardwareBackPressListener[name]
      },
      /**
       * 设置是否存在子页面，存在子页面的情况下，Android侧滑返回会触发setOnHardwareBackPressListener，iOS无任何事件
       * @param {boolean} exist
       */
      setExistChildPage(exist) {
        PageController.setHardwareBackPress(isAndroid ? false : exist, exist)
      },
      /**
       * 设置APP返回事件是否可用
       * @param {boolean} disabled 为true时禁用app侧滑或系统返回事件
       * @param {boolean} isChild 是否为H5子页面，适用于Android disabled设为false情况下，可触发H5的返回
       */
      setHardwareBackPress(disabled, isChild) {
        hardwareBackPressConfig.disabled = disabled
        hardwareBackPressConfig.isChild = isChild
        postMessage(hardwareBackPressConfig)
      },
      getHardwareBackPressConfig() {
        return hardwareBackPressConfig
      },
      /**
       * 调用LongPay退出页面事件，回到LongPay首页
       */
      quit() {
        postMessage({ type: 'quit' })
      }
    };
    rtn.onListener['hardwareBackPress'] = (data) => {
      if (hardwareBackPressConfig.objHardwareBackPress) {
        hardwareBackPressConfig.objHardwareBackPress(data)
      }
      listHardwareBackPressListener.forEach(listener => listener(data));
      for (const key of Object.keys(mapHardwareBackPressListener)) {
        mapHardwareBackPressListener[key](data)
      }
    }
    return rtn
  })()
  const getOpenIdAsync = () => {
    postMessage({
      type: 'openId'
    })
  }
  const Payment = (() => {
    return {
      ...events,
      setOnLowBalanceListener(listener) {
        this.onListener['lowBalance'] = listener
      },
      doPayment(data) {
        postMessage({ ...data, type: 'payment' })
      }
    }
  })()
  const openURL = (url) => {
    postMessage({
      type: 'openURL',
      url
    })
  }
  window.LongPayAppH5Bridge = (function () {
    /**
     * 调用LongPay支付
     * @param {object} data 包含paymentCaptcha、remark
     */
    return {
      events,
      PageController,
      Payment,
      postMessage,
      getLanguage,
      openURL,
      getOpenIdAsync,
      isLongPay
    }
  })()
})()
window.LongPayAppH5BridgeEvents = {
  hardwareBackPress: (data) => {
    window.LongPayAppH5Bridge.PageController.call(
      'hardwareBackPress', data)},
  lowBalance: (data) => window.LongPayAppH5Bridge.Payment.call('lowBalance',
      data),
  ...window.LongPayAppH5Bridge.events.onListener
}

/**
 * LongPay向H5发送的消息
 * @param type
 * @param {object} data
 */
function onLongPayMessage({ type = '', ...data } = {}) {
  try {
    window.LongPayAppH5BridgeEvents[type](data)
  } catch (error) {
    window.LongPayAppH5Bridge.postMessage({
      type: 'log',
      msg: error && error.message
    })
  }
}