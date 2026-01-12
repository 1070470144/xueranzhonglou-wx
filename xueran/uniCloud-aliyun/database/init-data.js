// 初始化数据脚本
// 用于导入测试数据到数据库

const testScripts = [
  {
    title: '经典版血染钟楼',
    version: '1.0.0',
    author: '官方团队',
    description: '经典版血染钟楼是一款经典的狼人杀剧本，适合5-8名玩家。游戏中包含狼人、预言家、女巫、猎人等经典角色，通过层层推理和投票找出隐藏的狼人玩家。游戏节奏紧凑，规则简单易懂，非常适合狼人杀游戏的入门玩家。',
    tags: ['经典', '入门', '5-8人'],
    images: ['/static/script1-1.jpg', '/static/script1-2.jpg'],
    likes: 1250,
    views: 15420,
    status: 'published',
    createTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7天前
    updateTime: Date.now()
  },
  {
    title: '诡秘小镇',
    version: '2.1.5',
    author: '剧本工坊',
    description: '诡秘小镇是一个充满悬疑和推理元素的剧本。玩家需要在小镇中寻找隐藏的线索，揭开小镇背后的秘密。适合8-12名玩家，游戏时长约为2-3小时。',
    tags: ['悬疑', '进阶', '8-12人'],
    images: ['/static/script2-1.jpg'],
    likes: 890,
    views: 12890,
    status: 'published',
    createTime: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5天前
    updateTime: Date.now()
  },
  {
    title: '时空裂隙',
    version: '1.3.2',
    author: '时光旅人',
    description: '时空裂隙是一个科幻题材的剧本。玩家将穿越不同的时空，解决各种时间悖论和空间谜题。适合10-15名玩家，包含复杂的剧情和角色关系。',
    tags: ['科幻', '复杂', '10-15人'],
    images: ['/static/script3-1.jpg', '/static/script3-2.jpg', '/static/script3-3.jpg'],
    likes: 654,
    views: 9876,
    status: 'published',
    createTime: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
    updateTime: Date.now()
  },
  {
    title: '幽灵庄园',
    version: '1.2.0',
    author: '恐怖大师',
    description: '幽灵庄园是一个恐怖题材的剧本。玩家需要在古老的庄园中寻找幽灵的线索，同时避免被其他玩家发现自己的身份。氛围紧张刺激，适合喜欢恐怖元素的玩家。',
    tags: ['恐怖', '推理', '6-10人'],
    images: ['/static/script4-1.jpg', '/static/script4-2.jpg'],
    likes: 432,
    views: 7654,
    status: 'published',
    createTime: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1天前
    updateTime: Date.now()
  },
  {
    title: '魔法学院',
    version: '1.0.1',
    author: '魔法师联盟',
    description: '魔法学院是一个奇幻题材的剧本。玩家扮演魔法学院的学生，需要在学习和任务中发现隐藏的秘密。包含丰富的魔法元素和校园生活场景。',
    tags: ['奇幻', '校园', '8-12人'],
    images: ['/static/script5-1.jpg'],
    likes: 321,
    views: 5432,
    status: 'published',
    createTime: Date.now() - 12 * 60 * 60 * 1000, // 12小时前
    updateTime: Date.now()
  }
]

module.exports = {
  testScripts
}
