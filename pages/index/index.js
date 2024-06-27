// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
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
      url: '../body-detect-3D/body-detect-3D',
    });
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },

  
})
