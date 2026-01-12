'use strict'

const {
  Controller
} = require('uni-cloud-router')

module.exports = class GameService extends Controller {
  /**
   * 获取游戏信息
   */
  async getGame() {
    const { gameId } = this.ctx.data

    // 输入验证
    if (!gameId) {
      return this.fail('gameId is required')
    }

    try {
      const db = uniCloud.database()
      const result = await db.collection('games')
        .doc(gameId)
        .get()

      if (!result.data || result.data.length === 0) {
        return this.fail('Game not found')
      }

      return this.success({
        game: result.data[0]
      })
    } catch (error) {
      console.error('Get game error:', error)
      return this.fail('Internal server error')
    }
  }

  /**
   * 创建新游戏
   */
  async createGame() {
    const { gameData } = this.ctx.data

    // 输入验证
    if (!gameData || !gameData.name) {
      return this.fail('Game name is required')
    }

    if (!gameData.playerCount || gameData.playerCount < 5 || gameData.playerCount > 12) {
      return this.fail('Player count must be between 5 and 12')
    }

    try {
      const db = uniCloud.database()

      // 生成游戏代码
      const gameCode = this.generateGameCode()

      const gameDoc = {
        ...gameData,
        gameCode,
        status: 'waiting',
        players: [],
        createTime: Date.now(),
        updateTime: Date.now()
      }

      const result = await db.collection('games').add(gameDoc)

      return this.success({
        gameId: result.id,
        gameCode
      })
    } catch (error) {
      console.error('Create game error:', error)
      return this.fail('Failed to create game')
    }
  }

  /**
   * 加入游戏
   */
  async joinGame() {
    const { gameCode, playerName, playerRole } = this.ctx.data

    // 输入验证
    if (!gameCode || !playerName) {
      return this.fail('Game code and player name are required')
    }

    try {
      const db = uniCloud.database()

      // 查找游戏
      const gameQuery = await db.collection('games')
        .where({
          gameCode,
          status: 'waiting'
        })
        .get()

      if (!gameQuery.data || gameQuery.data.length === 0) {
        return this.fail('Game not found or already started')
      }

      const game = gameQuery.data[0]

      // 检查玩家是否已存在
      const existingPlayer = game.players.find(p => p.name === playerName)
      if (existingPlayer) {
        return this.fail('Player name already exists in this game')
      }

      // 检查游戏是否已满
      if (game.players.length >= game.playerCount) {
        return this.fail('Game is full')
      }

      // 添加玩家
      const newPlayer = {
        id: Date.now().toString(),
        name: playerName,
        role: playerRole || 'villager',
        isAlive: true,
        joinTime: Date.now()
      }

      const updatedPlayers = [...game.players, newPlayer]

      await db.collection('games')
        .doc(game._id)
        .update({
          players: updatedPlayers,
          updateTime: Date.now()
        })

      return this.success({
        gameId: game._id,
        player: newPlayer,
        playerCount: updatedPlayers.length
      })
    } catch (error) {
      console.error('Join game error:', error)
      return this.fail('Failed to join game')
    }
  }

  /**
   * 开始游戏
   */
  async startGame() {
    const { gameId } = this.ctx.data

    // 输入验证
    if (!gameId) {
      return this.fail('gameId is required')
    }

    try {
      const db = uniCloud.database()

      const game = await db.collection('games')
        .doc(gameId)
        .get()

      if (!game.data || game.data.length === 0) {
        return this.fail('Game not found')
      }

      const gameData = game.data[0]

      // 检查游戏状态
      if (gameData.status !== 'waiting') {
        return this.fail('Game has already started')
      }

      // 检查玩家数量
      if (gameData.players.length < 5) {
        return this.fail('At least 5 players are required to start the game')
      }

      // 分配角色
      const assignedRoles = this.assignRoles(gameData.players, gameData.playerCount)

      // 更新游戏状态
      await db.collection('games')
        .doc(gameId)
        .update({
          status: 'playing',
          players: assignedRoles,
          startTime: Date.now(),
          updateTime: Date.now()
        })

      return this.success({
        message: 'Game started successfully',
        players: assignedRoles
      })
    } catch (error) {
      console.error('Start game error:', error)
      return this.fail('Failed to start game')
    }
  }

  /**
   * 生成游戏代码
   * @returns {string} 6位游戏代码
   */
  generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * 分配角色
   * @param {Array} players - 玩家列表
   * @param {number} totalPlayers - 总玩家数
   * @returns {Array} 分配了角色的玩家列表
   */
  assignRoles(players, totalPlayers) {
    // 血染钟楼角色配置 (基于玩家数量)
    const roleConfigs = {
      5: ['wolf', 'wolf', 'seer', 'doctor', 'villager'],
      6: ['wolf', 'wolf', 'seer', 'doctor', 'villager', 'villager'],
      7: ['wolf', 'wolf', 'seer', 'doctor', 'villager', 'villager', 'wolf'],
      8: ['wolf', 'wolf', 'wolf', 'seer', 'doctor', 'villager', 'villager', 'villager'],
      9: ['wolf', 'wolf', 'wolf', 'seer', 'doctor', 'hunter', 'villager', 'villager', 'villager'],
      10: ['wolf', 'wolf', 'wolf', 'seer', 'doctor', 'hunter', 'villager', 'villager', 'villager', 'villager'],
      11: ['wolf', 'wolf', 'wolf', 'seer', 'doctor', 'hunter', 'wolf', 'villager', 'villager', 'villager', 'villager'],
      12: ['wolf', 'wolf', 'wolf', 'seer', 'doctor', 'hunter', 'wolf', 'villager', 'villager', 'villager', 'villager', 'villager']
    }

    const roles = roleConfigs[totalPlayers] || roleConfigs[8]
    const shuffledRoles = this.shuffleArray([...roles])

    return players.map((player, index) => ({
      ...player,
      role: shuffledRoles[index] || 'villager'
    }))
  }

  /**
   * 数组乱序
   * @param {Array} array - 要乱序的数组
   * @returns {Array} 乱序后的数组
   */
  shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
