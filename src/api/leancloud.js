import AV from '../utils/av-weapp-min';


export default class LC {
  /**
   * Leancloud AV.Object 通用方法。以每一行数据的某个 pointer 为中心把数据重新组合。
   * 可用于 pointer 数据反查，中间表查询后排列。
   * @param  {[Array]} list          进行重组的数据。格式如：
   *                                   [{
   *                                     pointer: {},      // AV.Object
   *                                     subListName: {}   // AV.Object
   *                                   },{
   *                                     pointer: {},
   *                                     subListName: {}
   *                                   }]
   * @param  {[String]} key          pointer 在数据表中的名字。
   * @param  {[String]} subListName  组合后的子数组的名字。
   * @return {[Array]}               返回的数组格式为:
   *                                 [
   *                                   key: pointer <AV.Object>
   *                                   subListName: subList <Array>
   *                                 ]
   * TODO: 有 bug，如果 pointer 或 subListName 被删除，会报错。
   */
  static groupByPointer(list, key, subListName) {
    let ids = list.map(item => {
      if (item[key].objectId) {
        return item[key].objectId;
      };
    });
    ids = [...new Set(ids)];
    let newList = [];
    for (let id of ids) {
      let pointer = list.find(item => item[key].objectId == id)[key];
      let subList = list.filter(item => item[key].objectId === id);
      let obj = {};
      obj[key + 'Key'] = pointer;
      obj[subListName + 'List'] = subList;
      newList = [...newList, obj];

    }
    return newList;
  }

  /**
   * 从云端删除数组所指的所有对象。
   * @param  {Array}   list            需要删除的对象的 objectId 或 字段值 数组。
   * @param  {String}  fullClassName   list 为 objectId 时，`表名`。`className`
   *                                   list 为 字段值时，`表名.字段名`。`className.fieldName`
   * @return {Promise}                 AV.Promise
   * TODO: 未完成。
   */
  static async deleteAll(list, fullClassName) {
    // `表名+字段名` - [...fieldValues]
    if (fullClassName.includes('.')) {
      let [clsName, fieldName] = fullClassName.split('.');
      let query = new AV.Query(clsName);
      query.containedIn(fieldName, list);
      let objs = await query.find();
      return AV.Object.destroyAll(objs);
    // `表名` - [...objectIds]
    } else {
      return AV.Object.destroyAll(
        list.map(id => new AV.Object.createWithoutData(fullClassName, id))
      );
    };
  }

}
