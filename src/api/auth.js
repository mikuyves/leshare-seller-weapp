import base from './base'
import wepy from 'wepy'
import AV from '../utils/av-weapp-min'

export default class auth extends base {
  /**
   * 登录
   */
  static async login() {
    let user = await AV.User.loginWithWeapp() // 一键登录leancloud，返回用户在服务器上的资料。
    let data = await wepy.getUserInfo()  // 获取微信头像及用户名。
    console.log(data)
    // 把头像及 nickName 同步到服务端。
    // 然后再取回本地，原子更新，使用 fetchWhenSave 选项。
    user = await user.save({
      'nickName': data.userInfo.nickName,
      'avatarUrl': data.userInfo.avatarUrl,
      'gender': data.userInfo.gender,
      'city': data.userInfo.city,
      'province': data.userInfo.province,
      'rawData': data,
      'userInfo': data.userInfo
    }, {
      fetchWhenSave: true
    })
    wepy.$instance.globalData.user = user.toJSON()  // 保存到全局数据中。
    return user.toJSON()
  }
  /**
   * 短信验证码
   */
  static async sms (phone) {
    let user = await AV.User.loginWithWeapp(); // 一键登录，返回最新的资料。
    user.setMobilePhoneNumber(phone); // 登记电话号码。
    await user.save()
    AV.User.requestMobilePhoneVerify(phone);  // 发送验证码
  }

  static smsVerify (code) {
    return AV.User.verifyMobilePhone(code)
  }

  static async loginWithMobile(phone) {
  }
  /**
   * 检查登录情况
   */
  static async check(loginCode) {
    const url = `${this.baseUrl}/auth/check?login_code=${loginCode}`;
    const data = await this.get(url)
    return data.result;
  }

  static async getRoles() {
    let user = AV.User.current();
    let roles = await user.getRoles();
    return roles.map(role => role.toJSON().name)
  }

  /**
   * 设置权限值
   */
  static getConfig(key) {
    return wepy.$instance.globalData.auth[key];
  }

  /**
   * 读取权限值
   */
  static async setConfig(key, value) {
    await wepy.setStorage({key: key, data: value});
    wepy.$instance.globalData.auth[key] = value;
  }

  /**
   * 删除权限值
   */
  static async removeConfig(key) {
    wepy.$instance.globalData.auth[key] = null;
    await wepy.removeStorage({key: key});
  }
  /**
   * 验证用户位置，用于考勤，未完成。
   */
  static async saveCheckIn(shop) {
    let checkIn = new AV.Object('CheckIn');
    shop = new AV.Object.createWithoutData(
      'Shop', shop.toJSON().objectId
    );
    let user = new AV.Object.createWithoutData(
      '_User', AV.User.current().toJSON().objectId
    );
    checkIn.set('user', user)
    checkIn.set('shop', shop)
    return checkIn.save()
   }
  /**
   * 验证用户位置，用于考勤，未完成。
   */
  static async getNearbyShop() {
    let location = await wepy.getLocation();
    console.log(location)
    let lati = location.latitude
    let longi = location.longitude
    let point = new AV.GeoPoint(lati, longi)
    // 查询 100 米附件有没有店铺。未完成，还需要验证这个店员是否在这个店铺工作。
    let query = new AV.Query('Shop')
    query.withinKilometers('location', point, 2)
    let shops = await query.find()
    return shops.length === 0 ? null : shops[0]
   }
  /**
   * 获取用户列表。
   */
  static async getUsers() {
    let query = new AV.Query('_User')
    query.ascending('nickName')
    return query.find()
   }

  /**
   * 跳转设置页面授权
   */
  static openSetting() {
    return new Promise((resolve, reject) => {
      if (wx.openSetting) {
        wx.openSetting({
          success: res => {
            //尝试再次登录
            let isAuth = res.authSetting['scope.userInfo'];
            if (isAuth) {
              resolve(isAuth)
            } else {
              reject(isAuth)
            }
          }
        })
      } else {
        wx.showModal({
          title: '授权提示',
          content: '小程序需要您的微信授权才能使用哦~ 错过授权页面的处理方法：删除小程序->重新搜索进入->点击授权按钮'
        })
      }
    })
  }

}
