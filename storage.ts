import { Ok, Err, type Result } from 'ts-results-es';

export type StorageErrorKind =
    | 'storage.key'
    | 'storage.access'
    | 'storage.read'
    | 'storage.write'
    | 'storage.content'
    | 'storage.quota';

export interface StorageError {
    kind: StorageErrorKind;
    message: string;
    cause?: Error;
}

const toErr = (kind: StorageErrorKind, e: unknown): StorageError => ({
    kind,
    message: e instanceof Error ? e.message : String(e),
    cause: e instanceof Error ? e : undefined,
});

type StorageRef = Storage | "sessionStorage" | "localStorage" | null | undefined;

export const try_get_item = (storage: StorageRef, key: string): Result<string, StorageError> => {
  if (!key.length)
    return Err({ kind: 'storage.key', message: 'no key specified' });

	const resolved = try_resolve_storage(storage);
  if (resolved.isErr())
    return resolved;

  let res;
	try {
		res = resolved.value.getItem(key);
    if (res == null)
      return Err({
        kind: 'storage.content',
        message: 'Specified key not found'
      });
	} catch (err) {
    return Err(toErr('storage.read', err));
	}

  return Ok(res);
};

export const try_set_item = (storage: StorageRef, key: string, value: string): Result<void, StorageError> => {
  if (!key.length)
    return Err({ kind: 'storage.key', message: 'no key specified' });

	const resolved = try_resolve_storage(storage);
	if (resolved.isErr())
		return resolved;

	try {
		resolved.value.setItem(key, value);
	} catch (err) {
    const name = err instanceof Error ? err.name : '';
    const isQuota = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
    return Err(toErr(isQuota ? 'storage.quota' : 'storage.write', err));
	}

  return Ok.EMPTY;
};

export const try_remove_item = (storage: StorageRef, key: string): Result<void, StorageError> => {
  if (!key.length)
    return Err({ kind: 'storage.key', message: 'no key specified' });

	const resolved = try_resolve_storage(storage);
  if (resolved.isErr())
    return resolved;

	try {
    resolved.value.removeItem(key);
  } catch (err) {
    return Err(toErr('storage.write', err));
  }

  return Ok.EMPTY;
};

export const try_clear = (storage: StorageRef): Result<void, StorageError> => {
	const resolved = try_resolve_storage(storage);
  if (resolved.isErr()) 
    return resolved;

	try {
    resolved.value.clear();
  } catch (err) {
    return Err(toErr('storage.write', err));
  }

  return Ok.EMPTY;
};

const try_resolve_storage = (storage: StorageRef): Result<Storage, StorageError> => {
  if (!storage)
    return Err({ kind: 'storage.access', message: 'Storage not specified' });

	if (typeof storage === "string") {
		try {
			const resolved = globalThis?.[storage as keyof typeof globalThis];
			if (resolved == null)
        return Err({ kind: 'storage.access', message: 'Storage not found' });

      return Ok(resolved as Storage);
    } catch (err) {
      return Err(toErr('storage.access', err));
		}
	}
	return Ok(storage);
};
