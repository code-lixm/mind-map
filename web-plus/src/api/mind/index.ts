import type { CaseXmindInfo } from './types'

export const getById = async (id: string, options?: any): Promise<CaseXmindInfo> => {
    return Promise.resolve({ content: '{}' })
}

export const save = async (data: any): Promise<any> => {
    return Promise.resolve({ lastCaseXmindActionId: '1' })
}

export const acquireLock = async (id: string): Promise<boolean> => {
    return Promise.resolve(true)
}

export const releaseLock = async (id: string): Promise<void> => {
    return Promise.resolve()
}

export const getUpdateTimeById = async (id: string, options?: any): Promise<any> => {
    return Promise.resolve({ updateTime: '' })
}
