import base from './base'
import wepy from 'wepy'
import AV from '../utils/av-weapp-min'

export default class auth extends base {
  /**
   * 登录
   */
  static async login(phone, code) {
    const url = `${this.baseUrl}/auth/login?phone=${phone}&sms_code=${code}`;
    const dara = await this.get(url);
    return dara.login_code;
  }
  /**
   * 短信验证码
   */
  static async sms (phone) {
    // const url = `${this.baseUrl}/auth/sms_code?phone=${phone}`
    // const data = await this.get(url);
    // return data.message;
    let user = this.user.setMobilePhoneNumber(phone)
    user = await user.save()
    let res = await AV.User.requestMobilePhoneVerify(user.getMobilePhoneNumber())
    console.log(res)
  }

  static async smsVerify (code) {
    let res = await AV.User.verifyMobilePhone(code)
    return res
  }

  /**
   * 检查登录情况
   */
  static async check(loginCode) {
    const url = `${this.baseUrl}/auth/check?login_code=${loginCode}`;
    const data = await this.get(url)
    return data.result;
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
  static async isNearby() {
    let location = await wepy.getLocation();
    let lati = location.latitude
    let longi = location.longitude
    let point = new AV.GeoPoint(lati, longi)
    // 查询 100 米附件有没有店铺。未完成，还需要验证这个店员是否在这个店铺工作。
    let query = new AV.Query('Shop')
    query.withinKilometers('location', point, 0.1)
    let shops = await query.find()
    return shops.length = 0 ? false : true
   }
  /**
   * 获取用户列表。
   */
  static async getUsers() {
    let query = new AV.Query('_User')
    query.ascending('nickName')
    return query.find()
   }

}
