// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    wx.setKeepScreenOn({
      keepScreenOn: true,
      success: function() {
        console.log('Screen will remain on');
      },
      fail: function() {
        console.error('Failed to keep screen on');
      }
    });

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null,
    user:'',
    ready:false,
    pose:'',
    socketConnected: false,// 标识是否开启socket
    socketMsgQueue: [], // 发送的数据，也可以是其他形式
    user:'',
    threshold: 0.01, // 默认阈值
    thresholdDetected: false
  }
})
