import { describe, expect, test } from 'bun:test';
import { containerTail, isLocalUri, keptName, parseKeptName, rebase } from './photo-paths';

const OLD = 'file:///var/mobile/Containers/Data/Application/11111111-AAAA-BBBB-CCCC-222222222222';
const ROOTS = {
  cache: 'file:///var/mobile/Containers/Data/Application/NEW/Library/Caches/',
  document: 'file:///var/mobile/Containers/Data/Application/NEW/Documents',
};

describe('containerTail', () => {
  test('finds a camera photo in the cache folder', () => {
    expect(containerTail(`${OLD}/Library/Caches/Camera/a.jpg`)).toEqual({
      root: 'cache',
      tail: 'Camera/a.jpg',
    });
  });

  test('finds a file in documents', () => {
    expect(containerTail(`${OLD}/Documents/photos/x_1.jpg`)).toEqual({
      root: 'document',
      tail: 'photos/x_1.jpg',
    });
  });

  test('works for a simulator path', () => {
    const sim =
      'file:///Users/me/Library/Developer/CoreSimulator/Devices/D1/data/Containers/Data/Application/A1/Library/Caches/ImagePicker/b.png';
    expect(containerTail(sim)).toEqual({ root: 'cache', tail: 'ImagePicker/b.png' });
  });

  test('gives null for the temp folder, a web address and a bare name', () => {
    expect(containerTail(`${OLD}/tmp/lift/a.jpg`)).toBeNull();
    expect(containerTail('https://example.com/a.jpg')).toBeNull();
    expect(containerTail('a.jpg')).toBeNull();
  });
});

describe('rebase', () => {
  test('moves an old cache path under the new cache folder', () => {
    expect(rebase(`${OLD}/Library/Caches/Camera/a.jpg`, ROOTS)).toBe(`${ROOTS.cache}Camera/a.jpg`);
  });

  test('adds the missing slash after a root', () => {
    expect(rebase(`${OLD}/Documents/cutouts/x.png`, ROOTS)).toBe(`${ROOTS.document}/cutouts/x.png`);
  });

  test('gives null when the path is not in a folder that survives', () => {
    expect(rebase('https://example.com/a.jpg', ROOTS)).toBeNull();
  });
});

describe('kept names', () => {
  const id = '0b0f5a52-3c1e-4f0a-9d53-1c2b3a4d5e6f';

  test('round trip', () => {
    expect(parseKeptName(keptName(id, 1700000000000))).toEqual({ logId: id, stamp: 1700000000000 });
  });

  test('other files are not kept photos', () => {
    expect(parseKeptName('notes.txt')).toBeNull();
    expect(parseKeptName(`${id}.jpg`)).toBeNull();
  });
});

test('isLocalUri', () => {
  expect(isLocalUri('file:///a/b.jpg')).toBe(true);
  expect(isLocalUri('/a/b.jpg')).toBe(true);
  expect(isLocalUri('https://example.com/a.jpg')).toBe(false);
});
