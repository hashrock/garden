import { ref } from 'vue'
import type { ImageItem, Point, Size } from '../types'

export interface Group {
  id: string
  name: string
  position: Point
  size: Size
  children: string[]
  zIndex: number
  selected?: boolean
  expanded?: boolean
  backgroundColor?: string
  borderColor?: string
}

export function useGroupManager() {
  const groups = ref<Group[]>([])
  const selectedGroupIds = ref<Set<string>>(new Set())

  const createGroup = (name: string, position: Point, size: Size): Group => {
    const group: Group = {
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      position,
      size,
      children: [],
      zIndex: Math.max(...groups.value.map((g: Group) => g.zIndex), 0) + 1,
      selected: false,
      expanded: true,
      backgroundColor: 'rgba(240, 240, 240, 0.5)',
      borderColor: '#d0d0d0'
    }
    groups.value.push(group)
    return group
  }

  const addToGroup = (groupId: string, itemIds: string[]) => {
    const group = groups.value.find((g: Group) => g.id === groupId)
    if (group) {
      itemIds.forEach(id => {
        if (!group.children.includes(id)) {
          group.children.push(id)
        }
      })
    }
  }

  const removeFromGroup = (groupId: string, itemIds: string[]) => {
    const group = groups.value.find((g: Group) => g.id === groupId)
    if (group) {
      group.children = group.children.filter(id => !itemIds.includes(id))
    }
  }

  const deleteGroup = (groupId: string) => {
    const index = groups.value.findIndex((g: Group) => g.id === groupId)
    if (index !== -1) {
      groups.value.splice(index, 1)
      selectedGroupIds.value.delete(groupId)
    }
  }

  const selectGroup = (groupId: string, addToSelection = false) => {
    if (!addToSelection) {
      selectedGroupIds.value.clear()
    }
    selectedGroupIds.value.add(groupId)
  }

  const deselectGroup = (groupId: string) => {
    selectedGroupIds.value.delete(groupId)
  }

  const clearGroupSelection = () => {
    selectedGroupIds.value.clear()
  }

  const toggleGroupExpanded = (groupId: string) => {
    const group = groups.value.find((g: Group) => g.id === groupId)
    if (group) {
      group.expanded = !group.expanded
    }
  }

  const updateGroupPosition = (groupId: string, position: Point) => {
    const group = groups.value.find((g: Group) => g.id === groupId)
    if (group) {
      group.position = position
    }
  }

  const updateGroupSize = (groupId: string, size: Size) => {
    const group = groups.value.find((g: Group) => g.id === groupId)
    if (group) {
      group.size = size
    }
  }

  const getGroupAt = (point: Point): Group | null => {
    const sortedGroups = [...groups.value].sort((a: Group, b: Group) => b.zIndex - a.zIndex)
    
    for (const group of sortedGroups) {
      if (
        point.x >= group.position.x &&
        point.x <= group.position.x + group.size.width &&
        point.y >= group.position.y &&
        point.y <= group.position.y + group.size.height
      ) {
        return group
      }
    }
    return null
  }

  const getGroupsInRect = (x: number, y: number, width: number, height: number): Group[] => {
    return groups.value.filter((group: Group) => {
      const groupRight = group.position.x + group.size.width
      const groupBottom = group.position.y + group.size.height
      const rectRight = x + width
      const rectBottom = y + height
      
      return !(
        group.position.x > rectRight ||
        groupRight < x ||
        group.position.y > rectBottom ||
        groupBottom < y
      )
    })
  }

  const createGroupFromSelection = (selectedImages: ImageItem[], name?: string): Group | null => {
    if (selectedImages.length === 0) return null

    const minX = Math.min(...selectedImages.map(img => img.position.x))
    const minY = Math.min(...selectedImages.map(img => img.position.y))
    const maxX = Math.max(...selectedImages.map(img => img.position.x + img.size.width))
    const maxY = Math.max(...selectedImages.map(img => img.position.y + img.size.height))

    const padding = 20
    const group = createGroup(
      name || `Group ${groups.value.length + 1}`,
      { x: minX - padding, y: minY - padding },
      { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 }
    )

    addToGroup(group.id, selectedImages.map(img => img.id))
    
    selectedImages.forEach(img => {
      if (img.groupId !== undefined) {
        img.groupId = group.id
      }
    })

    return group
  }

  const ungroupItems = (groupId: string, images: ImageItem[]) => {
    const group = groups.value.find((g: Group) => g.id === groupId)
    if (!group) return

    group.children.forEach(childId => {
      const image = images.find(img => img.id === childId)
      if (image) {
        delete image.groupId
      }
    })

    deleteGroup(groupId)
  }

  const moveGroupChildren = (group: Group, deltaX: number, deltaY: number, images: ImageItem[]) => {
    group.children.forEach(childId => {
      const image = images.find(img => img.id === childId)
      if (image) {
        image.position.x += deltaX
        image.position.y += deltaY
      }
    })
  }

  return {
    groups,
    selectedGroupIds,
    createGroup,
    addToGroup,
    removeFromGroup,
    deleteGroup,
    selectGroup,
    deselectGroup,
    clearGroupSelection,
    toggleGroupExpanded,
    updateGroupPosition,
    updateGroupSize,
    getGroupAt,
    getGroupsInRect,
    createGroupFromSelection,
    ungroupItems,
    moveGroupChildren
  }
}