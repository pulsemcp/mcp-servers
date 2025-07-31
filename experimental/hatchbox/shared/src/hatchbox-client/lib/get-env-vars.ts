export async function getEnvVars(
  _baseUrl: string,
  _apiKey: string,
  _accountId: string,
  _appId: string
): Promise<Array<{ name: string; value: string }>> {
  // The Hatchbox API does not support retrieving environment variables
  // It only supports setting and deleting them
  throw new Error(
    'Retrieving environment variables is not supported by the Hatchbox API. ' +
      'The API only allows setting and deleting environment variables.'
  );
}
