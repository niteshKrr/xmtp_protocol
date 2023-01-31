import React, { useState, createContext, useEffect, useContext } from "react";
import { Client } from "@xmtp/xmtp-js";
import { WalletContext } from "./WalletContext";

export const XmtpContext = createContext();

export const XmtpContextProvider = ({ children }) => {
  const { signer, walletAddress } = useContext(WalletContext);
  const [providerState, setProviderState] = useState({
    client: null,
    initClient: () => {},
    loadingConversations: true,
    conversations: new Map(),
    convoMessages: new Map(),
  });

  const initClient = async (wallet) => {
    if (wallet && !providerState.client) {
      try {
        // Get the keys using a valid Signer. Save them somewhere secure.
        const keys = await Client.getKeys(signer, { env: "dev" });
        // Create a client using keys returned from getKeys
        const client = await Client.create(null, {
          env: "dev",
          privateKeyOverride: keys,
        });
        setProviderState({
          ...providerState,
          client,
        });
      } catch (e) {
        console.error(e);
        setProviderState({
          ...providerState,
          client: null,
        });
      }
    }
  };

  const disconnect = () => {
    setProviderState({
      ...providerState,
      client: null,
      conversations: new Map(),
      convoMessages: new Map(),
    });
  };

  useEffect(() => {
    signer ? setProviderState({ ...providerState, initClient }) : disconnect();
    // eslint-disable-next-line
  }, [signer]);

  useEffect(() => {
    if (!providerState.client) return;

    const listConversations = async () => {
      console.log("Listing conversations");
      setProviderState({ ...providerState, loadingConversations: true });
      const { client, convoMessages, conversations } = providerState;
      // Get all the conversations
      // Filter for the ones from your application
      const convos = (await client.conversations.list()).filter(
        (conversation) => !conversation.context?.conversationId
      );
      Promise.all(
        convos.map(async (convo) => {
          if (convo.peerAddress !== walletAddress) {
            console.log(`Saying GM to ${convo.peerAddress}`);
            const messages = await convo.messages();
            convoMessages.set(convo.peerAddress, messages);
            conversations.set(convo.peerAddress, convo);
            setProviderState({
              ...providerState,
              convoMessages,
              conversations,
            });
          }
        })
      ).then(() => {
        setProviderState({ ...providerState, loadingConversations: false });
      });
    };

    listConversations();
    // eslint-disable-next-line
  }, [providerState.client]);

  return (
    <XmtpContext.Provider value={[providerState, setProviderState]}>
      {children}
    </XmtpContext.Provider>
  );
};
