'use strict'

const {
  Router
} = require('uni-cloud-router')

const GameService = require('./gameService')

const router = new Router()

// 注册游戏服务
router.use('gameService', GameService)

exports.main = async (event, context) => {
  return router.serve(event, context)
}
