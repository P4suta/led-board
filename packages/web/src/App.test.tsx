import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(cleanup);

describe('<App />', () => {
  it('renders the app title', () => {
    const { getByText } = render(() => <App />);
    expect(getByText('LED 電光掲示板')).toBeTruthy();
  });

  it('renders the loading placeholder while fetching the font', () => {
    const { getByText } = render(() => <App />);
    expect(getByText('フォント読み込み中…')).toBeTruthy();
  });
});
