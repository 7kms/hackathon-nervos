import {
  Card,
  Input,
  Button,
  Row,
  Col,
  Spin,
  Tag,
  Descriptions,
  Form,
} from 'antd';
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { MetaCoinWrapper } from '../contracts/MetaCoinWrapper';
import { CONFIG } from '../../web3config';

async function createWeb3() {
  // Modern dapp browsers...
  if ((window as any).ethereum) {
    const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
    const providerConfig = {
      rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
      ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
      web3Url: godwokenRpcUrl,
    };

    const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
    const web3 = new Web3(provider || Web3.givenProvider);

    try {
      // Request account access if needed
      await (window as any).ethereum.enable();
    } catch (error) {
      // User denied account access...
    }

    return web3;
  }

  console.log(
    'Non-Ethereum browser detected. You should consider trying MetaMask!',
  );
  return null;
}

const useAccount = () => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [accounts, setAccounts] = useState<string[]>();
  const [polyjuiceAddress, setPolyjuiceAddress] = useState<
    string | undefined
  >();
  const [l2Balance, setL2Balance] = useState<string>();

  useEffect(() => {
    if (web3) {
      return;
    }
    (async () => {
      const _web3 = await createWeb3();
      setWeb3(_web3);

      const _accounts = [(window as any).ethereum.selectedAddress];
      setAccounts(_accounts);
      console.log({ _accounts });

      if (_accounts && _accounts[0]) {
        const _l2Balance =
          BigInt(await _web3!.eth.getBalance(_accounts[0])) / BigInt(10 ** 8);

        setL2Balance(_l2Balance.toString());
      }
    })();
  });
  useEffect(() => {
    if (accounts?.[0]) {
      const addressTranslator = new AddressTranslator();
      setPolyjuiceAddress(
        addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]),
      );
    } else {
      setPolyjuiceAddress(undefined);
    }
  }, [accounts?.[0]]);

  return {
    web3,
    ethWalletAddress: accounts?.[0],
    polyjuiceAddress,
    l2Balance,
  };
};

const useContract = (web3: Web3, setTransactionInProgress: any) => {
  const [contract, setContract] = useState<MetaCoinWrapper>();
  const [deployTxHash, setDeployTxHash] = useState<string | undefined>();

  const deployContract = async (ethWalletAddress: string) => {
    const _contract = new MetaCoinWrapper(web3);
    try {
      setDeployTxHash(undefined);
      setTransactionInProgress(true);

      const transactionHash = await _contract.deploy(ethWalletAddress);

      setDeployTxHash(transactionHash);
      setExistingContractAddress(_contract.address);
      toast(
        'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
        { type: 'success' },
      );
    } catch (error) {
      console.error(error);
      toast.error(
        'There was an error sending your transaction. Please check developer console.',
      );
    } finally {
      setTransactionInProgress(false);
    }
  };
  const setExistingContractAddress = (contractAddress: string) => {
    const _contract = new MetaCoinWrapper(web3);
    _contract.useDeployed(contractAddress.trim());
    setContract(_contract);
  };

  return {
    contract,
    deployTxHash,
    setExistingContractAddress,
    deployContract,
  };
};
const useTransaction = () => {
  const toastId = React.useRef<any>(null);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  useEffect(() => {
    if (transactionInProgress && !toastId.current) {
      toastId.current = toast.info(
        'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
        {
          position: 'top-right',
          autoClose: false,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          closeButton: false,
        },
      );
    } else if (!transactionInProgress && toastId.current) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }
  }, [transactionInProgress, toastId.current]);
  return setTransactionInProgress;
};

const useTransformETH = () => {
  const [targetPolyjuiceAddress, setTargetPolyjuiceAddress] = useState<
    string | undefined
  >();

  return {
    setInputEthAddress: (value: string) => {
      try {
        const addressTranslator = new AddressTranslator();
        setTargetPolyjuiceAddress(
          addressTranslator.ethAddressToGodwokenShortAddress(value),
        );
      } catch (e) {
        setTargetPolyjuiceAddress(undefined);
      }
    },
    targetPolyjuiceAddress,
  };
};
export default function App() {
  const setTransactionInProgress = useTransaction();
  const { web3, ethWalletAddress, polyjuiceAddress, l2Balance } = useAccount();
  const { contract, deployTxHash, setExistingContractAddress, deployContract } =
    useContract(web3, setTransactionInProgress);

  const { setInputEthAddress, targetPolyjuiceAddress } = useTransformETH();
  const [contractAddress, setContractAddress] = useState<string | undefined>(
    undefined,
  );
  const [targetAddress, setTargetAddress] = useState<string | undefined>();
  const [coinBalance, setCoinBalance] = useState<number | undefined>();
  const [coinLoading, setCoinLoading] = useState(false);

  const sendCoin = async () => {
    try {
      setTransactionInProgress(true);
      await contract!.sendCoin(ethWalletAddress!, targetAddress!, 50);
      toast(
        'Successfully set send 50 coins. You can refresh the read value now manually.',
        {
          type: 'success',
        },
      );
    } catch (error) {
      console.error(error);
      toast.error(
        'There was an error sending your transaction. Please check developer console.',
      );
    } finally {
      setTransactionInProgress(false);
    }
  };
  const getCoinBlance = async () => {
    setCoinLoading(true);
    const value = await contract!.getBalance(ethWalletAddress!, targetAddress!);
    toast('Successfully read latest stored value.', { type: 'success' });
    setCoinBalance(value);
    setCoinLoading(false);
  };
  return (
    <>
      <Card title="Account Info at Layer2">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Your ETH address">
            {ethWalletAddress}
          </Descriptions.Item>
          <Descriptions.Item label="Your Polyjuice address">
            {polyjuiceAddress}
          </Descriptions.Item>
          <Descriptions.Item label="Nervos Layer 2 balance">
            <Spin spinning={!l2Balance}>
              {l2Balance && <Tag color="red"> {l2Balance} CKB</Tag>}
            </Spin>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="Contract Info at Layer2"
        extra={
          <Button
            type="primary"
            onClick={() => deployContract(ethWalletAddress!)}
            disabled={!l2Balance}
          >
            Deploy contract
          </Button>
        }
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Existing contract id">
            <Input
              placeholder="Existing contract id"
              onChange={(e) => setContractAddress(e.target.value)}
            />
            <Button
              type="primary"
              disabled={!contractAddress || !l2Balance}
              onClick={() => setExistingContractAddress(contractAddress!)}
            >
              Use existing contract
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Deployed contract address">
            {contract?.address || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Deploy transaction hash">
            {deployTxHash || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Call Contract At Layer2">
        <Descriptions column={1} bordered>
          <Descriptions.Item>
            <Form.Item label="Please input a Polyjuice address">
              <Input
                style={{ width: 300 }}
                placeholder="Please input a Polyjuice address"
                onChange={(e) => setTargetAddress(e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Operate">
              <Button onClick={(e) => sendCoin()} disabled={!contract}>
                Send 50 Coins
              </Button>
              <Button onClick={(e) => getCoinBlance()} disabled={!contract}>
                Get Coin Blance
              </Button>
            </Form.Item>
            <Form.Item label="Result">
              <Spin spinning={coinLoading}>
                {!coinLoading && <Tag color="red">blance: {coinBalance}</Tag>}
              </Spin>
            </Form.Item>
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Address Transfer">
        <Form.Item label="Transform EthAddress to Polyjuice">
          <Input
            style={{ width: 300 }}
            placeholder="Please input a Eth address"
            onChange={(e) => setInputEthAddress(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="result">
          <span>{targetPolyjuiceAddress}</span>
        </Form.Item>
      </Card>

      <footer>
        The contract is deployed on Nervos Layer 2 - Godwoken + Polyjuice. After
        each transaction you might need to wait up to 120 seconds for the status
        to be reflected.
      </footer>
      <ToastContainer />
    </>
  );
}
