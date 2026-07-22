import {
  type AiConnection,
  type AiSettings,
  type CreateAiConnectionInput,
  createAiConnection,
  deleteAiConnection,
  discoverAiConnectionModels,
  getAiSettings,
  listAiConnections,
  testAiConnection,
  type UpdateAiConnectionInput,
  type UpdateAiSettingsInput,
  updateAiConnection,
  updateAiSettings,
} from '@asterism/db';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { aiConnectionKeys, aiSettingsKeys } from './keys';

const NO_USER = 'NO_USER';

/** 当前用户的全部生成连接（安全投影，永不含密文）。 */
export function useAiConnections() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? aiConnectionKeys.list(userId) : aiConnectionKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listAiConnections(supabase),
  });
}

/** 当前用户的 AI 偏好（活跃连接 / 模型 / 是否带入笔记）。 */
export function useAiSettings() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? aiSettingsKeys.detail(userId) : aiSettingsKeys.all,
    enabled: Boolean(userId),
    queryFn: () => getAiSettings(supabase, userId as string),
  });
}

/** 新建生成连接（凭据在受信函数内加密落库）。 */
export function useCreateAiConnection() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: CreateAiConnectionInput): Promise<AiConnection> => {
      if (!userId) {
        throw new Error(NO_USER);
      }
      return createAiConnection(supabase, input);
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: aiConnectionKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: aiSettingsKeys.detail(userId) });
      }
    },
  });
}

/** 编辑连接名称 / 端点 / 轮换密钥 / 禁用状态。 */
export function useUpdateAiConnection() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { connectionId: string } & UpdateAiConnectionInput) => {
      const { connectionId, ...changes } = input;
      return updateAiConnection(supabase, connectionId, changes);
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: aiConnectionKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: aiSettingsKeys.detail(userId) });
      }
    },
  });
}

/** 用选定模型探活连接，服务端据结果更新连接状态与能力。 */
export function useTestAiConnection() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: { connectionId: string; model: string }) =>
      testAiConnection(supabase, input.connectionId, input.model),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: aiConnectionKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: aiSettingsKeys.detail(userId) });
      }
    },
  });
}

/** 通过已保存的凭据发现模型；失败时 UI 保留手动输入路径。 */
export function useDiscoverAiConnectionModels() {
  return useMutation({
    mutationFn: (connectionId: string) => discoverAiConnectionModels(supabase, connectionId),
  });
}

/** 删除连接（受信函数先清理引用它的偏好项，再删除行）。 */
export function useDeleteAiConnection() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (connection: AiConnection) => deleteAiConnection(supabase, connection.id),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: aiConnectionKeys.list(userId) });
        void queryClient.invalidateQueries({ queryKey: aiSettingsKeys.detail(userId) });
      }
    },
  });
}

/** 更新 AI 偏好；活跃连接必须为已验证状态（受信函数强制）。 */
export function useUpdateAiSettings() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: UpdateAiSettingsInput): Promise<AiSettings> =>
      updateAiSettings(supabase, input),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: aiSettingsKeys.detail(userId) });
      }
    },
  });
}
