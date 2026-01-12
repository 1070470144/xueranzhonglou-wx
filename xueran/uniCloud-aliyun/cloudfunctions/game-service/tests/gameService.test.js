import { describe, it, expect, beforeEach, vi } from 'vitest'
import GameService from '../gameService'

// Mock uniCloud
global.uniCloud = {
  database: vi.fn()
}

describe('GameService', () => {
  let gameService

  beforeEach(() => {
    gameService = new GameService()
    gameService.ctx = {
      data: {},
      auth: { uid: 'test-user' }
    }

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('getGame', () => {
    it('should return game data when game exists', async () => {
      gameService.ctx.data = { gameId: 'game123' }

      const mockGameData = {
        _id: 'game123',
        name: 'Test Game',
        status: 'waiting'
      }

      uniCloud.database.mockReturnValue({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              data: [mockGameData]
            }))
          }))
        }))
      })

      const result = await gameService.getGame()

      expect(result.success).toBe(true)
      expect(result.data.game.name).toBe('Test Game')
    })

    it('should return error when gameId is missing', async () => {
      gameService.ctx.data = {}

      const result = await gameService.getGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('gameId is required')
    })

    it('should return error when game not found', async () => {
      gameService.ctx.data = { gameId: 'nonexistent' }

      uniCloud.database.mockReturnValue({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              data: []
            }))
          }))
        }))
      })

      const result = await gameService.getGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Game not found')
    })
  })

  describe('createGame', () => {
    it('should create game successfully', async () => {
      gameService.ctx.data = {
        gameData: {
          name: 'Test Game',
          playerCount: 8
        }
      }

      const mockResult = { id: 'new-game-id' }

      uniCloud.database.mockReturnValue({
        collection: vi.fn(() => ({
          add: vi.fn(() => Promise.resolve(mockResult))
        }))
      })

      const result = await gameService.createGame()

      expect(result.success).toBe(true)
      expect(result.data.gameId).toBe('new-game-id')
      expect(result.data.gameCode).toMatch(/^[A-Z0-9]{6}$/)
    })

    it('should return error when game name is missing', async () => {
      gameService.ctx.data = {
        gameData: {
          playerCount: 8
        }
      }

      const result = await gameService.createGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Game name is required')
    })

    it('should return error when player count is invalid', async () => {
      gameService.ctx.data = {
        gameData: {
          name: 'Test Game',
          playerCount: 3
        }
      }

      const result = await gameService.createGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Player count must be between 5 and 12')
    })
  })

  describe('joinGame', () => {
    it('should join game successfully', async () => {
      gameService.ctx.data = {
        gameCode: 'ABC123',
        playerName: 'TestPlayer'
      }

      const mockGame = {
        _id: 'game123',
        gameCode: 'ABC123',
        status: 'waiting',
        players: [],
        playerCount: 8
      }

      uniCloud.database.mockReturnValue({
        collection: vi.fn(() => ({
          where: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              data: [mockGame]
            }))
          })),
          doc: vi.fn(() => ({
            update: vi.fn(() => Promise.resolve())
          }))
        }))
      })

      const result = await gameService.joinGame()

      expect(result.success).toBe(true)
      expect(result.data.gameId).toBe('game123')
      expect(result.data.player.name).toBe('TestPlayer')
    })

    it('should return error when game code is missing', async () => {
      gameService.ctx.data = {
        playerName: 'TestPlayer'
      }

      const result = await gameService.joinGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Game code and player name are required')
    })

    it('should return error when player name already exists', async () => {
      gameService.ctx.data = {
        gameCode: 'ABC123',
        playerName: 'ExistingPlayer'
      }

      const mockGame = {
        _id: 'game123',
        gameCode: 'ABC123',
        status: 'waiting',
        players: [{ name: 'ExistingPlayer' }],
        playerCount: 8
      }

      uniCloud.database.mockReturnValue({
        collection: vi.fn(() => ({
          where: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              data: [mockGame]
            }))
          }))
        }))
      })

      const result = await gameService.joinGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Player name already exists in this game')
    })
  })

  describe('startGame', () => {
    it('should start game successfully', async () => {
      gameService.ctx.data = { gameId: 'game123' }

      const mockGame = {
        _id: 'game123',
        status: 'waiting',
        players: [
          { id: '1', name: 'Player1' },
          { id: '2', name: 'Player2' },
          { id: '3', name: 'Player3' },
          { id: '4', name: 'Player4' },
          { id: '5', name: 'Player5' }
        ],
        playerCount: 5
      }

      uniCloud.database.mockReturnValue({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              data: [mockGame]
            })),
            update: vi.fn(() => Promise.resolve())
          }))
        }))
      })

      const result = await gameService.startGame()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Game started successfully')
      expect(result.data.players).toHaveLength(5)
      // 检查是否所有玩家都被分配了角色
      result.data.players.forEach(player => {
        expect(player.role).toBeDefined()
      })
    })

    it('should return error when not enough players', async () => {
      gameService.ctx.data = { gameId: 'game123' }

      const mockGame = {
        _id: 'game123',
        status: 'waiting',
        players: [
          { id: '1', name: 'Player1' },
          { id: '2', name: 'Player2' }
        ],
        playerCount: 5
      }

      uniCloud.database.mockReturnValue({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              data: [mockGame]
            }))
          }))
        }))
      })

      const result = await gameService.startGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('At least 5 players are required to start the game')
    })
  })

  describe('utility functions', () => {
    it('should generate valid game code', () => {
      const code = gameService.generateGameCode()

      expect(code).toMatch(/^[A-Z0-9]{6}$/)
      expect(code).toHaveLength(6)
    })

    it('should shuffle array', () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = gameService.shuffleArray([...original])

      expect(shuffled).toHaveLength(5)
      expect(shuffled.sort()).toEqual(original)
    })

    it('should assign roles correctly for 5 players', () => {
      const players = [
        { id: '1', name: 'P1' },
        { id: '2', name: 'P2' },
        { id: '3', name: 'P3' },
        { id: '4', name: 'P4' },
        { id: '5', name: 'P5' }
      ]

      const playersWithRoles = gameService.assignRoles(players, 5)

      expect(playersWithRoles).toHaveLength(5)
      const roles = playersWithRoles.map(p => p.role)
      expect(roles).toContain('wolf')
      expect(roles).toContain('seer')
      expect(roles).toContain('doctor')
      expect(roles).toContain('villager')
    })
  })
})
