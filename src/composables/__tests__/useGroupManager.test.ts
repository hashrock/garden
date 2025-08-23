import { describe, it, expect, beforeEach } from 'vitest'
import { useGroupManager } from '../useGroupManager'
import type { ImageItem, Group } from '../../types'

describe('useGroupManager', () => {
  let groupManager: ReturnType<typeof useGroupManager>

  beforeEach(() => {
    groupManager = useGroupManager()
  })

  describe('グループの作成', () => {
    it('新しいグループを作成できる', () => {
      const group = groupManager.createGroup(
        'Test Group',
        { x: 100, y: 100 },
        { width: 200, height: 150 }
      )

      expect(group.name).toBe('Test Group')
      expect(group.position).toEqual({ x: 100, y: 100 })
      expect(group.size).toEqual({ width: 200, height: 150 })
      expect(group.children).toEqual([])
      expect(group.expanded).toBe(true)
      expect(groupManager.groups.value).toHaveLength(1)
    })

    it('複数のグループを作成するとzIndexが増加する', () => {
      const group1 = groupManager.createGroup('Group 1', { x: 0, y: 0 }, { width: 100, height: 100 })
      const group2 = groupManager.createGroup('Group 2', { x: 0, y: 0 }, { width: 100, height: 100 })
      
      expect(group2.zIndex).toBeGreaterThan(group1.zIndex)
    })
  })

  describe('グループへのアイテム追加と削除', () => {
    it('グループにアイテムを追加できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 0, y: 0 }, { width: 100, height: 100 })
      groupManager.addToGroup(group.id, ['item1', 'item2'])

      expect(group.children).toEqual(['item1', 'item2'])
    })

    it('同じアイテムを重複して追加しない', () => {
      const group = groupManager.createGroup('Test Group', { x: 0, y: 0 }, { width: 100, height: 100 })
      groupManager.addToGroup(group.id, ['item1'])
      groupManager.addToGroup(group.id, ['item1', 'item2'])

      expect(group.children).toEqual(['item1', 'item2'])
    })

    it('グループからアイテムを削除できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 0, y: 0 }, { width: 100, height: 100 })
      groupManager.addToGroup(group.id, ['item1', 'item2', 'item3'])
      groupManager.removeFromGroup(group.id, ['item2'])

      expect(group.children).toEqual(['item1', 'item3'])
    })
  })

  describe('グループの選択', () => {
    it('グループを選択できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 0, y: 0 }, { width: 100, height: 100 })
      groupManager.selectGroup(group.id)

      expect(groupManager.selectedGroupIds.value.has(group.id)).toBe(true)
    })

    it('複数のグループを選択できる', () => {
      const group1 = groupManager.createGroup('Group 1', { x: 0, y: 0 }, { width: 100, height: 100 })
      const group2 = groupManager.createGroup('Group 2', { x: 0, y: 0 }, { width: 100, height: 100 })
      
      groupManager.selectGroup(group1.id)
      groupManager.selectGroup(group2.id, true)

      expect(groupManager.selectedGroupIds.value.has(group1.id)).toBe(true)
      expect(groupManager.selectedGroupIds.value.has(group2.id)).toBe(true)
    })

    it('選択をクリアできる', () => {
      const group = groupManager.createGroup('Test Group', { x: 0, y: 0 }, { width: 100, height: 100 })
      groupManager.selectGroup(group.id)
      groupManager.clearGroupSelection()

      expect(groupManager.selectedGroupIds.value.size).toBe(0)
    })
  })

  describe('グループのドラッグ移動', () => {
    it('グループの位置を更新できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 100, y: 100 }, { width: 200, height: 150 })
      groupManager.updateGroupPosition(group.id, { x: 200, y: 250 })

      expect(group.position).toEqual({ x: 200, y: 250 })
    })

    it('グループの子要素も一緒に移動する', () => {
      const group = groupManager.createGroup('Test Group', { x: 100, y: 100 }, { width: 200, height: 150 })
      const mockImages: ImageItem[] = [
        {
          id: 'img1',
          filename: 'test1.png',
          dataUrl: 'data:image/png;base64,test1',
          position: { x: 120, y: 120 },
          size: { width: 50, height: 50 },
          originalSize: { width: 50, height: 50 },
          rotation: 0,
          zIndex: 1,
          groupId: group.id
        },
        {
          id: 'img2',
          filename: 'test2.png',
          dataUrl: 'data:image/png;base64,test2',
          position: { x: 180, y: 160 },
          size: { width: 60, height: 60 },
          originalSize: { width: 60, height: 60 },
          rotation: 0,
          zIndex: 2,
          groupId: group.id
        }
      ]
      
      groupManager.addToGroup(group.id, ['img1', 'img2'])
      groupManager.moveGroupChildren(group, 50, 30, mockImages)

      expect(mockImages[0].position).toEqual({ x: 170, y: 150 })
      expect(mockImages[1].position).toEqual({ x: 230, y: 190 })
    })
  })

  describe('グループの検出', () => {
    it('座標からグループを検出できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 100, y: 100 }, { width: 200, height: 150 })
      
      const foundGroup = groupManager.getGroupAt({ x: 150, y: 120 })
      expect(foundGroup?.id).toBe(group.id)
      
      const notFound = groupManager.getGroupAt({ x: 50, y: 50 })
      expect(notFound).toBe(null)
    })

    it('重なっているグループの場合、zIndexが大きい方を返す', () => {
      const group1 = groupManager.createGroup('Group 1', { x: 100, y: 100 }, { width: 200, height: 150 })
      const group2 = groupManager.createGroup('Group 2', { x: 150, y: 150 }, { width: 200, height: 150 })
      
      const foundGroup = groupManager.getGroupAt({ x: 180, y: 180 })
      expect(foundGroup?.id).toBe(group2.id)
    })

    it('矩形内のグループを検出できる', () => {
      const group1 = groupManager.createGroup('Group 1', { x: 50, y: 50 }, { width: 100, height: 100 })
      const group2 = groupManager.createGroup('Group 2', { x: 300, y: 300 }, { width: 100, height: 100 })
      const group3 = groupManager.createGroup('Group 3', { x: 100, y: 100 }, { width: 100, height: 100 })
      
      const groups = groupManager.getGroupsInRect(75, 75, 150, 150)
      const groupIds = groups.map(g => g.id)
      
      expect(groupIds).toContain(group1.id)
      expect(groupIds).toContain(group3.id)
      expect(groupIds).not.toContain(group2.id)
    })
  })

  describe('選択からグループを作成', () => {
    it('選択した画像からグループを作成できる', () => {
      const mockImages: ImageItem[] = [
        {
          id: 'img1',
          filename: 'test1.png',
          dataUrl: 'data:image/png;base64,test1',
          position: { x: 100, y: 100 },
          size: { width: 50, height: 50 },
          originalSize: { width: 50, height: 50 },
          rotation: 0,
          zIndex: 1
        },
        {
          id: 'img2',
          filename: 'test2.png',
          dataUrl: 'data:image/png;base64,test2',
          position: { x: 200, y: 150 },
          size: { width: 60, height: 60 },
          originalSize: { width: 60, height: 60 },
          rotation: 0,
          zIndex: 2
        }
      ]
      
      const group = groupManager.createGroupFromSelection(mockImages, 'My Group')
      
      expect(group).not.toBe(null)
      expect(group?.name).toBe('My Group')
      expect(group?.children).toEqual(['img1', 'img2'])
      expect(group?.position.x).toBeLessThan(100) // パディングを考慮
      expect(group?.position.y).toBeLessThan(100)
      expect(mockImages[0].groupId).toBe(group?.id)
      expect(mockImages[1].groupId).toBe(group?.id)
    })

    it('空の選択からはグループを作成しない', () => {
      const group = groupManager.createGroupFromSelection([])
      expect(group).toBe(null)
    })
  })

  describe('グループの解除', () => {
    it('グループを解除して子要素のgroupIdを削除できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 100, y: 100 }, { width: 200, height: 150 })
      const mockImages: ImageItem[] = [
        {
          id: 'img1',
          filename: 'test1.png',
          dataUrl: 'data:image/png;base64,test1',
          position: { x: 120, y: 120 },
          size: { width: 50, height: 50 },
          originalSize: { width: 50, height: 50 },
          rotation: 0,
          zIndex: 1,
          groupId: group.id
        }
      ]
      
      groupManager.addToGroup(group.id, ['img1'])
      groupManager.ungroupItems(group.id, mockImages)
      
      expect(mockImages[0].groupId).toBeUndefined()
      expect(groupManager.groups.value).toHaveLength(0)
    })
  })

  describe('グループの展開/折りたたみ', () => {
    it('グループの展開状態を切り替えられる', () => {
      const group = groupManager.createGroup('Test Group', { x: 0, y: 0 }, { width: 100, height: 100 })
      expect(group.expanded).toBe(true)
      
      groupManager.toggleGroupExpanded(group.id)
      expect(group.expanded).toBe(false)
      
      groupManager.toggleGroupExpanded(group.id)
      expect(group.expanded).toBe(true)
    })
  })

  describe('グループのサイズ変更', () => {
    it('グループのサイズを更新できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 100, y: 100 }, { width: 200, height: 150 })
      groupManager.updateGroupSize(group.id, { width: 300, height: 250 })
      
      expect(group.size).toEqual({ width: 300, height: 250 })
    })
  })

  describe('グループの削除', () => {
    it('グループを削除できる', () => {
      const group = groupManager.createGroup('Test Group', { x: 0, y: 0 }, { width: 100, height: 100 })
      groupManager.selectGroup(group.id)
      
      groupManager.deleteGroup(group.id)
      
      expect(groupManager.groups.value).toHaveLength(0)
      expect(groupManager.selectedGroupIds.value.has(group.id)).toBe(false)
    })
  })
})