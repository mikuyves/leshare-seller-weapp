/* eslint-disable new-cap */
import base from './base'
import wepy from 'wepy'
import AV from '../utils/av-weapp-min'

export default class auth extends base {
  /**
   * 登录
   */
  static async login() {
    let user = await AV.User.loginWithWeapp(); // 一键登录leancloud，返回用户在服务器上的资料。
    let data = await wepy.getUserInfo();  // 获取微信头像及用户名。
    console.log(data);
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
    });
    let userJSON = user.toJSON();
    let customer = await this.createOrUpdateCustomer(userJSON);
    await this.addCustomerRole();
    let isStaff = await this.checkIfStaff();

    // 保存到全局数据中。
    await this.setConfig('user', userJSON);
    await this.setConfig('customer', customer.toJSON());
    await this.setConfig('isStaff', isStaff);

    return user.toJSON()
  }
  /**
   * 创建或更新客户资料
   */
  static async createOrUpdateCustomer (user) {
    let rawUser = new AV.Object.createWithoutData('_User', user.objectId);
    let query = new AV.Query('Customer');
    query.equalTo('user', rawUser);
    let res = await query.first();
    if (!res) {
      // 创建
      return new AV.Object('Customer').save({
        'mobilePhoneNumber': user.mobilePhoneNumber,
        'nickName': user.nickName,
        'avatarUrl': user.avatarUrl,
        'user': rawUser,
        'priceLv': '4'
      });
    } else {
      // 更新
      // res.set('mobilePhoneNumber', user.mobilePhoneNumber);
      return res.save({
        'nickName': user.nickName,
        'avatarUrl': user.avatarUrl,
        'mobilePhoneNumber': user.mobilePhoneNumber
      })
    }
  }
  /**
   * 短信验证码
   */
  static async sms (phone) {
    let user = await AV.User.loginWithWeapp(); // 一键登录，返回最新的资料。
    user.setMobilePhoneNumber(phone); // 登记电话号码。
    await user.save();
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
    const data = await this.get(url);
    return data.result;
  }

  static async getRoles() {
    let user = AV.User.current();
    let roles = await user.getRoles();
    return roles.map(role => role.toJSON().name)
  }

  static async addCustomerRole() {
    let customerRole = await new AV.Query(AV.Role).get('599ac0cd1b69e600585e3acc');
    let roleQuery = new AV.Query(AV.Role);
    roleQuery.equalTo('name', 'customer');
    roleQuery.equalTo('users', AV.User.current());
    let res = await roleQuery.find();
    if (res.length > 0) {
      customerRole = res[0];
      return customerRole;
    } else {
      // 当前用户不具备 customerRole Role 的 Users 中。
      let relation = customerRole.getUsers();
      relation.add(AV.User.current());
      return customerRole.save();
    }
  }
  /**
   *  重要：鉴定是否员工。
   */
  static async checkIfStaff() {
    let roles = await this.getRoles();
    let data = await new AV.Query('Auth').equalTo('name', 'validRoles').first();
    data = data.toJSON();
    let validRoles = data.array;
    console.log(validRoles);
    return roles.some((element) => validRoles.includes(element));
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
    checkIn.set('user', user);
    checkIn.set('shop', shop);
    return checkIn.save()
   }
  /**
   * 验证用户位置，用于考勤，未完成。
   */
  static async getNearbyShop() {
    let location = await wepy.getLocation();
    console.log(location);
    let lati = location.latitude;
    let longi = location.longitude;
    let point = new AV.GeoPoint(lati, longi);
    // 查询 100 米附件有没有店铺。未完成，还需要验证这个店员是否在这个店铺工作。
    let query = new AV.Query('Shop');
    query.withinKilometers('location', point, 2);
    let shops = await query.find();
    return shops.length === 0 ? null : shops[0]
   }
  /**
   * 获取用户列表。
   */
  static async getUsers() {
    let query = new AV.Query('_User');
    query.ascending('nickName');
    return query.find()
   }
  /**
   * 获取用户列表。
   */
  static async getCustomers() {
    let query = new AV.Query('Customer');
    query.include('user');
    let customers = await query.find();
    console.log(customers);
    customers = customers.map(item => {
      item = item.toFullJSON();
      if (item.mobilePhoneNumber) {
        item.mobilePhoneNumber = item.mobilePhoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
      return item
    });
    console.log(customers);
    return customers
   }
  /**
   * 跳转设置页面授权
   */
  static openSetting() {
    return new Promise((resolve, reject) => {
      if (wx.openSetting) {
        wx.openSetting({
          success: res => {
            // 尝试再次登录。
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
