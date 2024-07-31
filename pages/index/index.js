// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const app = getApp();

Page({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
      tvIp: '',
      tvPort: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },
  onGoToPageA: function() {
    wx.navigateTo({
      url: '../body-detect/body-detect1',
    });
  },
  onGoToPageB: function() {
    wx.navigateTo({
      url: '../body-detect/body-detect1',
    })
    // wx.scanCode({
    //   success: (res) => {
    //     this.processQRCode(res.result);
    //   },
    //   fail: (err) => {
    //     console.error('扫码失败', err);
    //   }
    // });
  },
  processQRCode: function(code) {
    // TODO: 假设二维码内容格式为 IP:PORT 或 ws://IP:PORT ？？ 需要确认这里
    const match = code.match(/(ws:\/\/)?(\d+\.\d+\.\d+\.\d+)(?::(\d+))?/);
    if (match) {
      this.setData({
        tvIp: match[2],
        tvPort: match[3] || '8800' 
      });
      // 连接电视端的逻辑
      const { tvIp, tvPort } = this.data;
      const url = `ws://${tvIp}:${tvPort}`;
      wx.connectSocket({
        url: url,
      });
  
      wx.onSocketOpen(() => {
        console.log('WebSocket 连接成功');
        app.globalData.socketConnected = true;
        if (app.globalData.socketConnected) {
          wx.navigateTo({
            url: '../body-detect/body-detect1',
          })
        }
        
      });
      wx.onSocketMessage(msg => {
        //把JSONStr转为JSON
        if (typeof msg !== 'object') {
          msg = msg.replace(/\ufeff/g, "");
          var jj = JSON.parse(msg);
          msg = jj;
        }
        console.log("【websocket 监听到消息】内容如下：", msg);
        const user_choose = msg.data.toString().trim();
        app.globalData.user = user_choose;
      });
  
      // 断开时的动作
      wx.onSocketClose((res) => {
        console.log('WebSocket 已断开' , res)
        this.closeSocket();
        app.globalData.socketConnected = false;
        this.data.socketStatus = 'closed'
      });
  
      wx.onSocketError((error) => {
        console.error('WebSocket 连接打开失败',error,url);
      });
      
    }
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },

  
})
