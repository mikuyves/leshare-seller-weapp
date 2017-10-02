export default class Pagination {
  constructor (getDataFunc, processFunc) {
    // 数据集合
    this.list = [];
    // 起始数据
    this.start = 0;
    // 加载数据条数
    this.count = 20;
    // 获取数据函数
    this.getDataFunc = getDataFunc;
    // 数据处理函数
    this.processFunc = processFunc;
    // 正在加载中
    this.loading = false;
    // 参数
    this.params = [];
    // 是否底部
    this.reachBottom = false;
    // 是否需要清除
    this.toClear = false;
  }

  /**
   * 加载下一页数据。
   */
  async next (args) {
    const param = {
      from: this.start,
      limit: this.count
    };
    // 附加参数。
    this.loading = true;
    Object.assign(param, args);

    // 获取数据。
    const data = await this.getDataFunc(param);
    console.log(data)

    // 底部判断
    if (data === null || data.length < 1) {
      if (this.toClear) {
        this.clear();
      } else {
        this.reachBottom = true;
      }
      return this;
    }

    // 处理数据
    this._processData(data)

    // 设置数据
    if (this.toClear) {
      this.list = data;
      this.toClear = false;
    } else {
      this.list = this.list.concat(data);
    }
    this.start += this.count;
    // 加载完毕
    this.loading = false;
    if (data.length < this.count) {
      this.reachBottom = true;
    }
    return this;
  }

  /**
   * 恢复到第一页
   */
  reset () {
    this.toClear = true;
    this.start = 0;
  }
  clear () {
    this.toClear = false;
    this.start = 0;
    this.list = [];
  }

  /**
   * 处理数据（私有）
   */
  _processData (data) {
    if (this.processFunc) {
      for (let i in data) {
        const result = this.processFunc(data[i]);
        if (result) {
          data[i] = result;
        }
      }
    }
  }

}
