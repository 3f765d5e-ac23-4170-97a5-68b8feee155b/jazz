import type {
  AccountRole,
  Everyone,
  RawAccountID,
  RawGroup,
  Role,
} from "cojson";
import type {
  CoValue,
  CoValueClass,
  DeeplyLoaded,
  DepthsIn,
  ID,
  RefEncoded,
  Schema,
} from "../internal.js";
import {
  CoValueBase,
  MembersSym,
  Ref,
  ensureCoValueLoaded,
  loadCoValueWithoutMe,
  parseGroupCreateOptions,
  subscribeToCoValueWithoutMe,
  subscribeToExistingCoValue,
} from "../internal.js";
import { AccountAndGroupProxyHandler, isControlledAccount } from "./account.js";
import { type Account } from "./account.js";
import { type CoMap } from "./coMap.js";
import { type Profile } from "./profile.js";
import { RegisteredSchemas } from "./registeredSchemas.js";

/** @category Identity & Permissions */
export class Group extends CoValueBase implements CoValue {
  declare id: ID<this>;
  declare _type: "Group";
  static {
    this.prototype._type = "Group";
  }
  declare _raw: RawGroup;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static _schema: any;
  get _schema(): {
    profile: Schema;
    root: Schema;
    [MembersSym]: RefEncoded<Account>;
  } {
    return (this.constructor as typeof Group)._schema;
  }
  static {
    this._schema = {
      profile: "json" satisfies Schema,
      root: "json" satisfies Schema,
      [MembersSym]: {
        ref: () => RegisteredSchemas["Account"],
        optional: false,
      } satisfies RefEncoded<Account>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    Object.defineProperty(this.prototype, "_schema", {
      get: () => this._schema,
    });
  }

  declare profile: Profile | null;
  declare root: CoMap | null;
  declare [MembersSym]: Account | null;

  get _refs(): {
    profile: Ref<Profile> | undefined;
    root: Ref<CoMap> | undefined;
  } {
    const profileID = this._raw.get("profile") as unknown as
      | ID<NonNullable<this["profile"]>>
      | undefined;
    const rootID = this._raw.get("root") as unknown as
      | ID<NonNullable<this["root"]>>
      | undefined;
    return {
      profile:
        profileID &&
        (new Ref(
          profileID,
          this._loadedAs,
          this._schema.profile as RefEncoded<NonNullable<this["profile"]>>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any as this["profile"] extends Profile
          ? Ref<this["profile"]>
          : never),
      root:
        rootID &&
        (new Ref(
          rootID,
          this._loadedAs,
          this._schema.root as RefEncoded<NonNullable<this["root"]>>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any as this["root"] extends CoMap ? Ref<this["root"]> : never),
    };
  }

  /** @deprecated Don't use constructor directly, use .create */
  constructor(options: { fromRaw: RawGroup } | { owner: Account | Group }) {
    super();
    let raw: RawGroup;

    if (options && "fromRaw" in options) {
      raw = options.fromRaw;
    } else {
      const initOwner = options.owner;
      if (!initOwner) throw new Error("No owner provided");
      if (initOwner._type === "Account" && isControlledAccount(initOwner)) {
        const rawOwner = initOwner._raw;
        raw = rawOwner.createGroup();
      } else {
        throw new Error("Can only construct group as a controlled account");
      }
    }

    Object.defineProperties(this, {
      id: {
        value: raw.id,
        enumerable: false,
      },
      _raw: { value: raw, enumerable: false },
    });

    return new Proxy(this, AccountAndGroupProxyHandler as ProxyHandler<this>);
  }

  static create<G extends Group>(
    this: CoValueClass<G>,
    options?: { owner: Account } | Account,
  ) {
    return new this(parseGroupCreateOptions(options));
  }

  myRole(): Role | undefined {
    return this._raw.myRole();
  }

  addMember(member: Everyone, role: "writer" | "reader"): void;
  addMember(member: Account, role: AccountRole): void;
  addMember(member: Everyone | Account, role: AccountRole) {
    this._raw.addMember(member === "everyone" ? member : member._raw, role);
  }

  removeMember(member: Everyone | Account) {
    return this._raw.removeMember(member === "everyone" ? member : member._raw);
  }

  get members() {
    return this._raw
      .keys()
      .filter((key) => {
        return key === "everyone" || key.startsWith("co_");
      })
      .map((id) => {
        const role = this._raw.get(id as Everyone | RawAccountID);
        const accountID =
          id === "everyone" ? undefined : (id as unknown as ID<Account>);
        const ref =
          accountID &&
          new Ref<NonNullable<this[MembersSym]>>(
            accountID,
            this._loadedAs,
            this._schema[MembersSym],
          );
        const accessRef = () => ref?.accessFrom(this, "members." + id);

        return {
          id: id as unknown as Everyone | ID<this[MembersSym]>,
          role,
          ref,
          get account() {
            return accessRef();
          },
        };
      });
  }

  extend(
    parent: Group,
    roleMapping?: "reader" | "writer" | "admin" | "inherit",
  ) {
    this._raw.extend(parent._raw, roleMapping);
    return this;
  }

  /** @category Subscription & Loading */
  static load<C extends Group, Depth>(
    this: CoValueClass<C>,
    id: ID<C>,
    depth: Depth & DepthsIn<C>,
  ): Promise<DeeplyLoaded<C, Depth> | undefined>;
  static load<C extends Group, Depth>(
    this: CoValueClass<C>,
    id: ID<C>,
    as: Account,
    depth: Depth & DepthsIn<C>,
  ): Promise<DeeplyLoaded<C, Depth> | undefined>;
  static load<C extends Group, Depth>(
    this: CoValueClass<C>,
    id: ID<C>,
    asOrDepth: Account | (Depth & DepthsIn<C>),
    depth?: Depth & DepthsIn<C>,
  ): Promise<DeeplyLoaded<C, Depth> | undefined> {
    return loadCoValueWithoutMe(this, id, asOrDepth, depth);
  }

  /** @category Subscription & Loading */
  static subscribe<C extends Group, Depth>(
    this: CoValueClass<C>,
    id: ID<C>,
    depth: Depth & DepthsIn<C>,
    listener: (value: DeeplyLoaded<C, Depth>) => void,
  ): () => void;
  static subscribe<C extends Group, Depth>(
    this: CoValueClass<C>,
    id: ID<C>,
    as: Account,
    depth: Depth & DepthsIn<C>,
    listener: (value: DeeplyLoaded<C, Depth>) => void,
  ): () => void;
  static subscribe<C extends Group, Depth>(
    this: CoValueClass<C>,
    id: ID<C>,
    asOrDepth: Account | (Depth & DepthsIn<C>),
    depthOrListener:
      | (Depth & DepthsIn<C>)
      | ((value: DeeplyLoaded<C, Depth>) => void),
    listener?: (value: DeeplyLoaded<C, Depth>) => void,
  ): () => void {
    return subscribeToCoValueWithoutMe<C, Depth>(
      this,
      id,
      asOrDepth,
      depthOrListener,
      listener,
    );
  }

  /** @category Subscription & Loading */
  ensureLoaded<G extends Group, Depth>(
    this: G,
    depth: Depth & DepthsIn<G>,
  ): Promise<DeeplyLoaded<G, Depth>> {
    return ensureCoValueLoaded(this, depth);
  }

  /** @category Subscription & Loading */
  subscribe<G extends Group, Depth>(
    this: G,
    depth: Depth & DepthsIn<G>,
    listener: (value: DeeplyLoaded<G, Depth>) => void,
  ): () => void {
    return subscribeToExistingCoValue(this, depth, listener);
  }

  /**
   * Wait for the `Group` to be uploaded to the other peers.
   *
   * @category Subscription & Loading
   */
  waitForSync(options?: { timeout?: number }) {
    return this._raw.core.waitForSync(options);
  }
}

RegisteredSchemas["Group"] = Group;
