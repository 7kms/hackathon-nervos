import Web3 from 'web3';
import * as MetaCoinJSON from '../../build/contracts/MetaCoin.json';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class MetaCoinWrapper {
    web3: Web3;

    contract: any;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(MetaCoinJSON.abi as any) as any;
    }

    isDeployed = () => {
        return Boolean(this.address);
    };

    getBalance = async (walletAddress: string, tagterAddress: string) => {
        const data = await this.contract.methods
            .getBalance(tagterAddress)
            .call({ from: walletAddress });

        return parseInt(data, 10);
    };

    sendCoin = async (walletAddress: string, toAddress: string, amount: number) => {
        const tx = await this.contract.methods.sendCoin(toAddress, amount).send({
            ...DEFAULT_SEND_OPTIONS,
            from: walletAddress
        });

        return tx;
    };

    deploy = async (walletAddress: string) => {
        const deployTx = await (this.contract
            .deploy({
                data: MetaCoinJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: walletAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(deployTx.contractAddress);

        return deployTx.transactionHash;
    };

    useDeployed = (contractAddress: string) => {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    };
}
