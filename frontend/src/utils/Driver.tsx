import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;

export async function setDriver(connectionURI, username, password) {
  try {
    driver = neo4j.driver(connectionURI, neo4j.auth.basic(username, password));
    const serverInfo = await driver.getServerInfo();
    localStorage.setItem(
      'neo4j.connection',
      JSON.stringify({ uri: connectionURI, user: username, password: password })
    );
    return true;
  } catch (err) {
    console.error(`Connection error\n${err}\nCause: ${err.cause}`);
    return false;
  }
}

export async function disconnect() {
  try {
    driver.close();
    return true;
  } catch (err) {
    console.error(`Disconnection error\n${err}\nCause: ${err.cause}`);
    return false;
  }
}
