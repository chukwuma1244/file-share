import { Amplify } from 'aws-amplify'
import awsExports from './aws-exports'
import awsConfig from './aws-config'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const mergedConfig = {
  Auth: {
    Cognito: {
      userPoolId: awsConfig.Auth.Cognito.userPoolId,
      userPoolClientId: awsConfig.Auth.Cognito.userPoolClientId,
      identityPoolId: 'us-east-1:7d5412ed-3cef-44d6-8619-da0e6c363066',
      loginWith: awsConfig.Auth.Cognito.loginWith,
    },
  },
  API: awsConfig.API,
  Storage: {
    S3: {
      bucket: awsExports.aws_user_files_s3_bucket,
      region: awsExports.aws_user_files_s3_bucket_region,
    },
  },
}

Amplify.configure(mergedConfig)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
