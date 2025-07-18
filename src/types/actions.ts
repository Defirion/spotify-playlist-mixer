// Action types for state management with Redux-like patterns

import {
  User,
  Playlist,
  Track,
  SelectedPlaylist,
  MixResult,
  MixPreview,
  Notification,
  AppError,
} from './index';

// Base action interface
export interface BaseAction<T = any> {
  type: string;
  payload?: T;
  error?: boolean;
  meta?: any;
}

// Auth Actions
export type AuthActionType =
  | 'AUTH_LOGIN_START'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH_START'
  | 'AUTH_TOKEN_REFRESH_SUCCESS'
  | 'AUTH_TOKEN_REFRESH_FAILURE'
  | 'AUTH_SET_USER'
  | 'AUTH_CLEAR_ERROR';

export interface AuthLoginStartAction extends BaseAction {
  type: 'AUTH_LOGIN_START';
}

export interface AuthLoginSuccessAction extends BaseAction {
  type: 'AUTH_LOGIN_SUCCESS';
  payload: {
    user: User;
    token: string;
  };
}

export interface AuthLoginFailureAction extends BaseAction {
  type: 'AUTH_LOGIN_FAILURE';
  payload: AppError;
  error: true;
}

export interface AuthLogoutAction extends BaseAction {
  type: 'AUTH_LOGOUT';
}

export interface AuthTokenRefreshStartAction extends BaseAction {
  type: 'AUTH_TOKEN_REFRESH_START';
}

export interface AuthTokenRefreshSuccessAction extends BaseAction {
  type: 'AUTH_TOKEN_REFRESH_SUCCESS';
  payload: {
    token: string;
  };
}

export interface AuthTokenRefreshFailureAction extends BaseAction {
  type: 'AUTH_TOKEN_REFRESH_FAILURE';
  payload: AppError;
  error: true;
}

export interface AuthSetUserAction extends BaseAction {
  type: 'AUTH_SET_USER';
  payload: User;
}

export interface AuthClearErrorAction extends BaseAction {
  type: 'AUTH_CLEAR_ERROR';
}

export type AuthAction =
  | AuthLoginStartAction
  | AuthLoginSuccessAction
  | AuthLoginFailureAction
  | AuthLogoutAction
  | AuthTokenRefreshStartAction
  | AuthTokenRefreshSuccessAction
  | AuthTokenRefreshFailureAction
  | AuthSetUserAction
  | AuthClearErrorAction;

// Playlist Actions
export type PlaylistActionType =
  | 'PLAYLISTS_FETCH_START'
  | 'PLAYLISTS_FETCH_SUCCESS'
  | 'PLAYLISTS_FETCH_FAILURE'
  | 'PLAYLISTS_SELECT'
  | 'PLAYLISTS_DESELECT'
  | 'PLAYLISTS_UPDATE_CONFIG'
  | 'PLAYLISTS_CLEAR_SELECTED'
  | 'PLAYLISTS_CLEAR_ERROR';

export interface PlaylistsFetchStartAction extends BaseAction {
  type: 'PLAYLISTS_FETCH_START';
}

export interface PlaylistsFetchSuccessAction extends BaseAction {
  type: 'PLAYLISTS_FETCH_SUCCESS';
  payload: Playlist[];
}

export interface PlaylistsFetchFailureAction extends BaseAction {
  type: 'PLAYLISTS_FETCH_FAILURE';
  payload: AppError;
  error: true;
}

export interface PlaylistsSelectAction extends BaseAction {
  type: 'PLAYLISTS_SELECT';
  payload: {
    playlist: Playlist;
    tracks: Track[];
  };
}

export interface PlaylistsDeselectAction extends BaseAction {
  type: 'PLAYLISTS_DESELECT';
  payload: string; // playlist ID
}

export interface PlaylistsUpdateConfigAction extends BaseAction {
  type: 'PLAYLISTS_UPDATE_CONFIG';
  payload: {
    playlistId: string;
    config: {
      ratio: number;
      isEnabled: boolean;
    };
  };
}

export interface PlaylistsClearSelectedAction extends BaseAction {
  type: 'PLAYLISTS_CLEAR_SELECTED';
}

export interface PlaylistsClearErrorAction extends BaseAction {
  type: 'PLAYLISTS_CLEAR_ERROR';
}

export type PlaylistAction =
  | PlaylistsFetchStartAction
  | PlaylistsFetchSuccessAction
  | PlaylistsFetchFailureAction
  | PlaylistsSelectAction
  | PlaylistsDeselectAction
  | PlaylistsUpdateConfigAction
  | PlaylistsClearSelectedAction
  | PlaylistsClearErrorAction;

// Mixer Actions
export type MixerActionType =
  | 'MIXER_GENERATE_START'
  | 'MIXER_GENERATE_SUCCESS'
  | 'MIXER_GENERATE_FAILURE'
  | 'MIXER_PREVIEW_START'
  | 'MIXER_PREVIEW_SUCCESS'
  | 'MIXER_PREVIEW_FAILURE'
  | 'MIXER_SAVE_START'
  | 'MIXER_SAVE_SUCCESS'
  | 'MIXER_SAVE_FAILURE'
  | 'MIXER_CLEAR_CURRENT'
  | 'MIXER_CLEAR_PREVIEW'
  | 'MIXER_ADD_TO_HISTORY'
  | 'MIXER_CLEAR_HISTORY'
  | 'MIXER_CLEAR_ERROR';

export interface MixerGenerateStartAction extends BaseAction {
  type: 'MIXER_GENERATE_START';
}

export interface MixerGenerateSuccessAction extends BaseAction {
  type: 'MIXER_GENERATE_SUCCESS';
  payload: MixResult;
}

export interface MixerGenerateFailureAction extends BaseAction {
  type: 'MIXER_GENERATE_FAILURE';
  payload: AppError;
  error: true;
}

export interface MixerPreviewStartAction extends BaseAction {
  type: 'MIXER_PREVIEW_START';
}

export interface MixerPreviewSuccessAction extends BaseAction {
  type: 'MIXER_PREVIEW_SUCCESS';
  payload: MixPreview;
}

export interface MixerPreviewFailureAction extends BaseAction {
  type: 'MIXER_PREVIEW_FAILURE';
  payload: AppError;
  error: true;
}

export interface MixerSaveStartAction extends BaseAction {
  type: 'MIXER_SAVE_START';
}

export interface MixerSaveSuccessAction extends BaseAction {
  type: 'MIXER_SAVE_SUCCESS';
  payload: Playlist;
}

export interface MixerSaveFailureAction extends BaseAction {
  type: 'MIXER_SAVE_FAILURE';
  payload: AppError;
  error: true;
}

export interface MixerClearCurrentAction extends BaseAction {
  type: 'MIXER_CLEAR_CURRENT';
}

export interface MixerClearPreviewAction extends BaseAction {
  type: 'MIXER_CLEAR_PREVIEW';
}

export interface MixerAddToHistoryAction extends BaseAction {
  type: 'MIXER_ADD_TO_HISTORY';
  payload: MixResult;
}

export interface MixerClearHistoryAction extends BaseAction {
  type: 'MIXER_CLEAR_HISTORY';
}

export interface MixerClearErrorAction extends BaseAction {
  type: 'MIXER_CLEAR_ERROR';
}

export type MixerAction =
  | MixerGenerateStartAction
  | MixerGenerateSuccessAction
  | MixerGenerateFailureAction
  | MixerPreviewStartAction
  | MixerPreviewSuccessAction
  | MixerPreviewFailureAction
  | MixerSaveStartAction
  | MixerSaveSuccessAction
  | MixerSaveFailureAction
  | MixerClearCurrentAction
  | MixerClearPreviewAction
  | MixerAddToHistoryAction
  | MixerClearHistoryAction
  | MixerClearErrorAction;

// UI Actions
export type UIActionType =
  | 'UI_OPEN_MODAL'
  | 'UI_CLOSE_MODAL'
  | 'UI_ADD_NOTIFICATION'
  | 'UI_REMOVE_NOTIFICATION'
  | 'UI_CLEAR_NOTIFICATIONS'
  | 'UI_SET_THEME';

export interface UIOpenModalAction extends BaseAction {
  type: 'UI_OPEN_MODAL';
  payload: string; // modal name
}

export interface UICloseModalAction extends BaseAction {
  type: 'UI_CLOSE_MODAL';
}

export interface UIAddNotificationAction extends BaseAction {
  type: 'UI_ADD_NOTIFICATION';
  payload: Notification;
}

export interface UIRemoveNotificationAction extends BaseAction {
  type: 'UI_REMOVE_NOTIFICATION';
  payload: string; // notification ID
}

export interface UIClearNotificationsAction extends BaseAction {
  type: 'UI_CLEAR_NOTIFICATIONS';
}

export interface UISetThemeAction extends BaseAction {
  type: 'UI_SET_THEME';
  payload: 'light' | 'dark';
}

export type UIAction =
  | UIOpenModalAction
  | UICloseModalAction
  | UIAddNotificationAction
  | UIRemoveNotificationAction
  | UIClearNotificationsAction
  | UISetThemeAction;

// Combined action type
export type AppAction = AuthAction | PlaylistAction | MixerAction | UIAction;

// Action creators type helpers
export type ActionCreator<T extends BaseAction> = (...args: any[]) => T;
export type AsyncActionCreator<T extends BaseAction> = (...args: any[]) => Promise<T>;

// Thunk action type for async operations
export type ThunkAction<R = void> = (
  dispatch: (action: AppAction) => void,
  getState: () => any
) => R;