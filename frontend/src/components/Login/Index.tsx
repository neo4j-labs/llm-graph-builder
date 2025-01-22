import { useAuth0 } from '@auth0/auth0-react';
import Neo4jLogoColor from '../../logo-color.svg';
import { Button, Flex, Typography } from '@neo4j-ndl/react';

export default function Login() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className='w-dvw h-dvh flex justify-center items-center n-bg-palette-neutral-bg-default'>
      <div className='max-w-screen-lg grid gap-4 grid-cols-2 grid-rows-1 n-shadow-light-raised p-4 n-bg-palette-neutral-bg-weak n-rounded-lg'>
        <Flex flexDirection='column' gap='4' alignItems='center'>
          <img src={Neo4jLogoColor} className='w-[80%]'></img>
          <Typography variant='body-medium'>
            Turn unstructured information into to rich insightful Knowledge Graph
          </Typography>
        </Flex>
        <div className='flex justify-center items-center'>
          <Button
            size='large'
            onClick={() => {
              loginWithRedirect();
            }}
          >
            Login with Neo4j
          </Button>
        </div>
      </div>
    </div>
  );
}
