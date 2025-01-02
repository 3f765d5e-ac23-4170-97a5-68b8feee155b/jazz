import { expect, test } from "vitest";
import { expectMap } from "../coValue.js";
import { ControlledAgent } from "../coValues/account.js";
import { WasmCrypto } from "../crypto/WasmCrypto.js";
import { expectGroup } from "../typeUtils/expectGroup.js";
import {
  createTwoConnectedNodes,
  groupWithTwoAdmins,
  groupWithTwoAdminsHighLevel,
  hotSleep,
  loadCoValueOrFail,
  newGroup,
  newGroupHighLevel,
} from "./testUtils.js";

const Crypto = await WasmCrypto.create();

test("Initial admin can add another admin to a group", () => {
  groupWithTwoAdmins();
});

test("Initial admin can add another admin to a group (high level)", () => {
  groupWithTwoAdminsHighLevel();
});

test("Added admin can add a third admin to a group", () => {
  const { groupCore, otherAdmin, node } = groupWithTwoAdmins();

  const groupAsOtherAdmin = expectGroup(
    groupCore
      .testWithDifferentAccount(
        otherAdmin,
        Crypto.newRandomSessionID(otherAdmin.id),
      )
      .getCurrentContent(),
  );

  expect(groupAsOtherAdmin.get(otherAdmin.id)).toEqual("admin");

  const thirdAdmin = node.createAccount();

  groupAsOtherAdmin.set(thirdAdmin.id, "admin", "trusting");
  expect(groupAsOtherAdmin.get(thirdAdmin.id)).toEqual("admin");
});

test("Added adming can add a third admin to a group (high level)", () => {
  const { group, otherAdmin } = groupWithTwoAdminsHighLevel();

  const groupAsOtherAdmin = expectGroup(
    group.core
      .testWithDifferentAccount(
        otherAdmin,
        Crypto.newRandomSessionID(otherAdmin.id),
      )
      .getCurrentContent(),
  );

  const thirdAdmin = groupAsOtherAdmin.core.node.createAccount();

  groupAsOtherAdmin.addMember(thirdAdmin, "admin");

  expect(groupAsOtherAdmin.get(thirdAdmin.id)).toEqual("admin");
});

test("Admins can't demote other admins in a group", () => {
  const { groupCore, admin, otherAdmin } = groupWithTwoAdmins();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  groupContent.set(otherAdmin.id, "writer", "trusting");
  expect(groupContent.get(otherAdmin.id)).toEqual("admin");

  expect(groupContent.get(otherAdmin.id)).toEqual("admin");

  const groupAsOtherAdmin = expectGroup(
    groupCore
      .testWithDifferentAccount(
        otherAdmin,
        Crypto.newRandomSessionID(otherAdmin.id),
      )
      .getCurrentContent(),
  );

  groupAsOtherAdmin.set(admin.id, "writer", "trusting");
  expect(groupAsOtherAdmin.get(admin.id)).toEqual("admin");
});

test("Admins can't demote other admins in a group (high level)", () => {
  const { group, admin, otherAdmin } = groupWithTwoAdminsHighLevel();

  const groupAsOtherAdmin = expectGroup(
    group.core
      .testWithDifferentAccount(
        otherAdmin,
        Crypto.newRandomSessionID(otherAdmin.id),
      )
      .getCurrentContent(),
  );

  expect(() => groupAsOtherAdmin.addMemberInternal(admin.id, "writer")).toThrow(
    "Failed to set role",
  );

  expect(groupAsOtherAdmin.get(admin.id)).toEqual("admin");
});

test("Admins an add writers to a group, who can't add admins, writers, or readers", () => {
  const { groupCore, node } = newGroup();
  const writer = node.createAccount();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  groupContent.set(writer.id, "writer", "trusting");
  expect(groupContent.get(writer.id)).toEqual("writer");

  expect(groupContent.get(writer.id)).toEqual("writer");

  const groupAsWriter = expectGroup(
    groupCore
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  expect(groupAsWriter.get(writer.id)).toEqual("writer");

  const otherAgent = node.createAccount();

  groupAsWriter.set(otherAgent.id, "admin", "trusting");
  expect(groupAsWriter.get(otherAgent.id)).toBeUndefined();

  groupAsWriter.set(otherAgent.id, "writer", "trusting");
  expect(groupAsWriter.get(otherAgent.id)).toBeUndefined();

  groupAsWriter.set(otherAgent.id, "reader", "trusting");
  expect(groupAsWriter.get(otherAgent.id)).toBeUndefined();
});

test("Admins an add writers to a group, who can't add admins, writers, or readers (high level)", () => {
  const { group, node } = newGroupHighLevel();

  const writer = node.createAccount();

  group.addMember(writer, "writer");
  expect(group.get(writer.id)).toEqual("writer");

  const groupAsWriter = expectGroup(
    group.core
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  expect(groupAsWriter.get(writer.id)).toEqual("writer");

  const otherAgent = groupAsWriter.core.node.createAccount();

  expect(() => groupAsWriter.addMember(otherAgent, "admin")).toThrow(
    "Failed to set role",
  );
  expect(() => groupAsWriter.addMember(otherAgent, "writer")).toThrow(
    "Failed to set role",
  );
  expect(() => groupAsWriter.addMember(otherAgent, "reader")).toThrow(
    "Failed to set role",
  );

  expect(groupAsWriter.get(otherAgent.id)).toBeUndefined();
});

test("Admins can add readers to a group, who can't add admins, writers, or readers", () => {
  const { groupCore, node } = newGroup();
  const reader = node.createAccount();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  groupContent.set(reader.id, "reader", "trusting");
  expect(groupContent.get(reader.id)).toEqual("reader");

  const groupAsReader = expectGroup(
    groupCore
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(groupAsReader.get(reader.id)).toEqual("reader");

  const otherAgent = node.createAccount();

  groupAsReader.set(otherAgent.id, "admin", "trusting");
  expect(groupAsReader.get(otherAgent.id)).toBeUndefined();

  groupAsReader.set(otherAgent.id, "writer", "trusting");
  expect(groupAsReader.get(otherAgent.id)).toBeUndefined();

  groupAsReader.set(otherAgent.id, "reader", "trusting");

  expect(groupAsReader.get(otherAgent.id)).toBeUndefined();
});

test("Admins can add readers to a group, who can't add admins, writers, or readers (high level)", () => {
  const { group, node } = newGroupHighLevel();

  const reader = node.createAccount();

  group.addMember(reader, "reader");
  expect(group.get(reader.id)).toEqual("reader");

  const groupAsReader = expectGroup(
    group.core
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(groupAsReader.get(reader.id)).toEqual("reader");

  const otherAgent = groupAsReader.core.node.createAccount();

  expect(() => groupAsReader.addMember(otherAgent, "admin")).toThrow(
    "Failed to set role",
  );
  expect(() => groupAsReader.addMember(otherAgent, "writer")).toThrow(
    "Failed to set role",
  );
  expect(() => groupAsReader.addMember(otherAgent, "reader")).toThrow(
    "Failed to set role",
  );

  expect(groupAsReader.get(otherAgent.id)).toBeUndefined();
});

test("Admins can write to an object that is owned by their group", () => {
  const { node, groupCore } = newGroup();

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "trusting");
  expect(childContent.get("foo")).toEqual("bar");
});

test("Admins can write to an object that is owned by their group (high level)", () => {
  const { group } = newGroupHighLevel();

  const childObject = group.createMap();

  childObject.set("foo", "bar", "trusting");
  expect(childObject.get("foo")).toEqual("bar");
});

test("Writers can write to an object that is owned by their group", () => {
  const { node, groupCore } = newGroup();

  const writer = node.createAccount();

  const group = expectGroup(groupCore.getCurrentContent());
  group.set(writer.id, "writer", "trusting");
  expect(group.get(writer.id)).toEqual("writer");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childObjectAsWriter = childObject.testWithDifferentAccount(
    writer,
    Crypto.newRandomSessionID(writer.id),
  );

  const childContentAsWriter = expectMap(
    childObjectAsWriter.getCurrentContent(),
  );

  childContentAsWriter.set("foo", "bar", "trusting");
  expect(childContentAsWriter.get("foo")).toEqual("bar");
});

test("Writers can write to an object that is owned by their group (high level)", () => {
  const { node, group } = newGroupHighLevel();

  const writer = node.createAccount();

  group.addMember(writer, "writer");

  const childObject = group.createMap();

  const childObjectAsWriter = expectMap(
    childObject.core
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  childObjectAsWriter.set("foo", "bar", "trusting");
  expect(childObjectAsWriter.get("foo")).toEqual("bar");
});

test("Readers can not write to an object that is owned by their group", () => {
  const { node, groupCore } = newGroup();

  const reader = node.createAccount();

  const group = expectGroup(groupCore.getCurrentContent());
  group.set(reader.id, "reader", "trusting");
  expect(group.get(reader.id)).toEqual("reader");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childObjectAsReader = childObject.testWithDifferentAccount(
    reader,
    Crypto.newRandomSessionID(reader.id),
  );

  const childContentAsReader = expectMap(
    childObjectAsReader.getCurrentContent(),
  );

  childContentAsReader.set("foo", "bar", "trusting");
  expect(childContentAsReader.get("foo")).toBeUndefined();
});

test("Readers can not write to an object that is owned by their group (high level)", () => {
  const { node, group } = newGroupHighLevel();

  const reader = node.createAccount();

  group.addMember(reader, "reader");

  const childObject = group.createMap();

  const childObjectAsReader = expectMap(
    childObject.core
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  childObjectAsReader.set("foo", "bar", "trusting");
  expect(childObjectAsReader.get("foo")).toBeUndefined();
});

test("Admins can set group read key and then use it to create and read private transactions in owned objects", () => {
  const { node, groupCore, admin } = newGroup();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");

  expect(groupContent.get(`${readKeyID}_for_${admin.id}`)).toEqual(revelation);

  groupContent.set("readKey", readKeyID, "trusting");

  expect(groupContent.get("readKey")).toEqual(readKeyID);

  expect(groupCore.getCurrentReadKey().secret).toEqual(readKey);

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");
});

test("Admins can set group read key and then use it to create and read private transactions in owned objects (high level)", () => {
  const { group } = newGroupHighLevel();

  const childObject = group.createMap();

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");
});

test("Admins can set group read key and then writers can use it to create and read private transactions in owned objects", () => {
  const { node, groupCore, admin } = newGroup();

  const writer = node.createAccount();

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  groupContent.set(writer.id, "writer", "trusting");
  expect(groupContent.get(writer.id)).toEqual("writer");

  const revelation1 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${admin.id}`, revelation1, "trusting");

  const revelation2 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: writer.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${writer.id}`, revelation2, "trusting");

  groupContent.set("readKey", readKeyID, "trusting");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childObjectAsWriter = childObject.testWithDifferentAccount(
    writer,
    Crypto.newRandomSessionID(writer.id),
  );

  expect(childObject.getCurrentReadKey().secret).toEqual(readKey);

  const childContentAsWriter = expectMap(
    childObjectAsWriter.getCurrentContent(),
  );

  childContentAsWriter.set("foo", "bar", "private");
  expect(childContentAsWriter.get("foo")).toEqual("bar");
});

test("Admins can set group read key and then writers can use it to create and read private transactions in owned objects (high level)", () => {
  const { node, group } = newGroupHighLevel();

  const writer = node.createAccount();

  group.addMember(writer, "writer");

  const childObject = group.createMap();

  const childObjectAsWriter = expectMap(
    childObject.core
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  childObjectAsWriter.set("foo", "bar", "private");
  expect(childObjectAsWriter.get("foo")).toEqual("bar");
});

test("Admins can set group read key and then use it to create private transactions in owned objects, which readers can read", () => {
  const { node, groupCore, admin } = newGroup();

  const reader = node.createAccount();

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  groupContent.set(reader.id, "reader", "trusting");
  expect(groupContent.get(reader.id)).toEqual("reader");

  const revelation1 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${admin.id}`, revelation1, "trusting");

  const revelation2 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: reader.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${reader.id}`, revelation2, "trusting");

  groupContent.set("readKey", readKeyID, "trusting");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  const childObjectAsReader = childObject.testWithDifferentAccount(
    reader,
    Crypto.newRandomSessionID(reader.id),
  );

  expect(childObjectAsReader.getCurrentReadKey().secret).toEqual(readKey);

  const childContentAsReader = expectMap(
    childObjectAsReader.getCurrentContent(),
  );

  expect(childContentAsReader.get("foo")).toEqual("bar");
});

test("Admins can set group read key and then use it to create private transactions in owned objects, which readers can read (high level)", () => {
  const { node, group } = newGroupHighLevel();

  const reader = node.createAccount();

  group.addMember(reader, "reader");

  const childObject = group.createMap();

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");

  const childContentAsReader = expectMap(
    childObject.core
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader.get("foo")).toEqual("bar");
});

test("Admins can set group read key and then use it to create private transactions in owned objects, which readers can read, even with a separate later revelation for the same read key", () => {
  const { node, groupCore, admin } = newGroup();

  const reader1 = node.createAccount();

  const reader2 = node.createAccount();

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  groupContent.set(reader1.id, "reader", "trusting");
  expect(groupContent.get(reader1.id)).toEqual("reader");

  const revelation1 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${admin.id}`, revelation1, "trusting");

  const revelation2 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: reader1.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${reader1.id}`, revelation2, "trusting");

  groupContent.set("readKey", readKeyID, "trusting");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  const childObjectAsReader1 = childObject.testWithDifferentAccount(
    reader1,
    Crypto.newRandomSessionID(reader1.id),
  );

  expect(childObjectAsReader1.getCurrentReadKey().secret).toEqual(readKey);

  const childContentAsReader1 = expectMap(
    childObjectAsReader1.getCurrentContent(),
  );

  expect(childContentAsReader1.get("foo")).toEqual("bar");

  const revelation3 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: reader2.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${reader2.id}`, revelation3, "trusting");

  const childObjectAsReader2 = childObject.testWithDifferentAccount(
    reader2,
    Crypto.newRandomSessionID(reader2.id),
  );

  expect(childObjectAsReader2.getCurrentReadKey().secret).toEqual(readKey);

  const childContentAsReader2 = expectMap(
    childObjectAsReader2.getCurrentContent(),
  );

  expect(childContentAsReader2.get("foo")).toEqual("bar");
});

test("Admins can set group read key and then use it to create private transactions in owned objects, which readers can read, even with a separate later revelation for the same read key (high level)", () => {
  const { node, group } = newGroupHighLevel();

  const reader1 = node.createAccount();

  const reader2 = node.createAccount();

  group.addMember(reader1, "reader");

  const childObject = group.createMap();

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");

  const childContentAsReader1 = expectMap(
    childObject.core
      .testWithDifferentAccount(reader1, Crypto.newRandomSessionID(reader1.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader1.get("foo")).toEqual("bar");

  group.addMember(reader2, "reader");

  const childContentAsReader2 = expectMap(
    childObject.core
      .testWithDifferentAccount(reader2, Crypto.newRandomSessionID(reader2.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader2.get("foo")).toEqual("bar");
});

test("Admins can set group read key, make a private transaction in an owned object, rotate the read key, make another private transaction, and both can be read by the admin", () => {
  const { node, groupCore, admin } = newGroup();

  const groupContent = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation1 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${admin.id}`, revelation1, "trusting");

  groupContent.set("readKey", readKeyID, "trusting");
  expect(groupContent.get("readKey")).toEqual(readKeyID);
  expect(groupCore.getCurrentReadKey().secret).toEqual(readKey);

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  const { secret: readKey2, id: readKeyID2 } = Crypto.newRandomKeySecret();

  const revelation2 = Crypto.seal({
    message: readKey2,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID2}_for_${admin.id}`, revelation2, "trusting");

  groupContent.set("readKey", readKeyID2, "trusting");
  expect(groupContent.get("readKey")).toEqual(readKeyID2);
  expect(groupCore.getCurrentReadKey().secret).toEqual(readKey2);

  expect(childContent.get("foo")).toEqual("bar");

  childContent.set("foo2", "bar2", "private");
  expect(childContent.get("foo2")).toEqual("bar2");
});

test("Admins can set group read key, make a private transaction in an owned object, rotate the read key, make another private transaction, and both can be read by the admin (high level)", () => {
  const { group } = newGroupHighLevel();

  const childObject = group.createMap();

  const firstReadKey = childObject.core.getCurrentReadKey();

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");

  group.rotateReadKey();

  expect(childObject.core.getCurrentReadKey()).not.toEqual(firstReadKey);

  childObject.set("foo2", "bar2", "private");
  expect(childObject.get("foo2")).toEqual("bar2");
});

test("Admins can set group read key, make a private transaction in an owned object, rotate the read key, add a reader, make another private transaction in the owned object, and both can be read by the reader", () => {
  const { node, groupCore, admin } = newGroup();

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const groupContent = expectGroup(groupCore.getCurrentContent());
  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();

  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");

  groupContent.set("readKey", readKeyID, "trusting");
  expect(groupContent.get("readKey")).toEqual(readKeyID);
  expect(groupCore.getCurrentReadKey().secret).toEqual(readKey);

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  expect(childContent.get("foo")).toEqual("bar");

  const reader = node.createAccount();

  const { secret: readKey2, id: readKeyID2 } = Crypto.newRandomKeySecret();

  const revelation2 = Crypto.seal({
    message: readKey2,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID2}_for_${admin.id}`, revelation2, "trusting");

  const revelation3 = Crypto.seal({
    message: readKey2,
    from: admin.currentSealerSecret(),
    to: reader.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID2}_for_${reader.id}`, revelation3, "trusting");

  groupContent.set(
    `${readKeyID}_for_${readKeyID2}`,
    Crypto.encryptKeySecret({
      toEncrypt: { id: readKeyID, secret: readKey },
      encrypting: { id: readKeyID2, secret: readKey2 },
    }).encrypted,
    "trusting",
  );

  groupContent.set("readKey", readKeyID2, "trusting");

  expect(groupContent.get("readKey")).toEqual(readKeyID2);
  expect(groupCore.getCurrentReadKey().secret).toEqual(readKey2);

  groupContent.set(reader.id, "reader", "trusting");
  expect(groupContent.get(reader.id)).toEqual("reader");

  childContent.set("foo2", "bar2", "private");
  expect(childContent.get("foo2")).toEqual("bar2");

  const childObjectAsReader = childObject.testWithDifferentAccount(
    reader,
    Crypto.newRandomSessionID(reader.id),
  );

  expect(childObjectAsReader.getCurrentReadKey().secret).toEqual(readKey2);

  const childContentAsReader = expectMap(
    childObjectAsReader.getCurrentContent(),
  );

  expect(childContentAsReader.get("foo")).toEqual("bar");
  expect(childContentAsReader.get("foo2")).toEqual("bar2");
});

test("Admins can set group read key, make a private transaction in an owned object, rotate the read key, add a reader, make another private transaction in the owned object, and both can be read by the reader (high level)", () => {
  const { node, group } = newGroupHighLevel();

  const childObject = group.createMap();

  const firstReadKey = childObject.core.getCurrentReadKey();

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");

  expect(childObject.get("foo")).toEqual("bar");

  group.rotateReadKey();

  expect(childObject.core.getCurrentReadKey()).not.toEqual(firstReadKey);

  const reader = node.createAccount();

  group.addMember(reader, "reader");

  childObject.set("foo2", "bar2", "private");
  expect(childObject.get("foo2")).toEqual("bar2");

  const childContentAsReader = expectMap(
    childObject.core
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader.get("foo")).toEqual("bar");
  expect(childContentAsReader.get("foo2")).toEqual("bar2");
});

test("Admins can set group read rey, make a private transaction in an owned object, rotate the read key, add two readers, rotate the read key again to kick out one reader, make another private transaction in the owned object, and only the remaining reader can read both transactions", () => {
  const { node, groupCore, admin } = newGroup();

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const groupContent = expectGroup(groupCore.getCurrentContent());
  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const reader = node.createAccount();

  const reader2 = node.createAccount();

  const revelation1 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${admin.id}`, revelation1, "trusting");

  const revelation2 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: reader.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${reader.id}`, revelation2, "trusting");

  const revelation3 = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: reader2.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID}_for_${reader2.id}`, revelation3, "trusting");

  groupContent.set("readKey", readKeyID, "trusting");
  expect(groupContent.get("readKey")).toEqual(readKeyID);
  expect(groupCore.getCurrentReadKey().secret).toEqual(readKey);

  groupContent.set(reader.id, "reader", "trusting");
  expect(groupContent.get(reader.id)).toEqual("reader");
  groupContent.set(reader2.id, "reader", "trusting");
  expect(groupContent.get(reader2.id)).toEqual("reader");

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  let childObjectAsReader = childObject.testWithDifferentAccount(
    reader,
    Crypto.newRandomSessionID(reader.id),
  );

  expect(expectMap(childObjectAsReader.getCurrentContent()).get("foo")).toEqual(
    "bar",
  );

  let childObjectAsReader2 = childObject.testWithDifferentAccount(
    reader,
    Crypto.newRandomSessionID(reader.id),
  );

  expect(
    expectMap(childObjectAsReader2.getCurrentContent()).get("foo"),
  ).toEqual("bar");

  const { secret: readKey2, id: readKeyID2 } = Crypto.newRandomKeySecret();

  const newRevelation1 = Crypto.seal({
    message: readKey2,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(`${readKeyID2}_for_${admin.id}`, newRevelation1, "trusting");

  const newRevelation2 = Crypto.seal({
    message: readKey2,
    from: admin.currentSealerSecret(),
    to: reader2.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupContent.set(
    `${readKeyID2}_for_${reader2.id}`,
    newRevelation2,
    "trusting",
  );

  groupContent.set("readKey", readKeyID2, "trusting");
  expect(groupContent.get("readKey")).toEqual(readKeyID2);
  expect(groupCore.getCurrentReadKey().secret).toEqual(readKey2);

  groupContent.set(reader.id, "revoked", "trusting");
  // expect(editable.get(reader.id)).toEqual("revoked");

  expect(childObject.getCurrentReadKey().secret).toEqual(readKey2);

  childContent.set("foo2", "bar2", "private");
  expect(childContent.get("foo2")).toEqual("bar2");

  // TODO: make sure these instances of coValues sync between each other so this isn't necessary?
  childObjectAsReader = childObject.testWithDifferentAccount(
    reader,
    Crypto.newRandomSessionID(reader.id),
  );
  childObjectAsReader2 = childObject.testWithDifferentAccount(
    reader2,
    Crypto.newRandomSessionID(reader2.id),
  );

  expect(
    expectMap(childObjectAsReader.getCurrentContent()).get("foo2"),
  ).toBeUndefined();
  expect(
    expectMap(childObjectAsReader2.getCurrentContent()).get("foo2"),
  ).toEqual("bar2");
});

test("Admins can set group read rey, make a private transaction in an owned object, rotate the read key, add two readers, rotate the read key again to kick out one reader, make another private transaction in the owned object, and only the remaining reader can read both transactions (high level)", async () => {
  const { node, group } = newGroupHighLevel();

  const childObject = group.createMap();

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");

  expect(childObject.get("foo")).toEqual("bar");

  group.rotateReadKey();

  const secondReadKey = childObject.core.getCurrentReadKey();

  const reader = node.createAccount();

  const reader2 = node.createAccount();

  group.addMember(reader, "reader");
  group.addMember(reader2, "reader");

  childObject.set("foo2", "bar2", "private");
  expect(childObject.get("foo2")).toEqual("bar2");

  await group.removeMember(reader);

  expect(childObject.core.getCurrentReadKey()).not.toEqual(secondReadKey);

  childObject.set("foo3", "bar3", "private");
  expect(childObject.get("foo3")).toEqual("bar3");

  const childContentAsReader2 = expectMap(
    childObject.core
      .testWithDifferentAccount(reader2, Crypto.newRandomSessionID(reader2.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader2.get("foo")).toEqual("bar");
  expect(childContentAsReader2.get("foo2")).toEqual("bar2");
  expect(childContentAsReader2.get("foo3")).toEqual("bar3");

  expect(
    expectMap(
      childObject.core
        .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
        .getCurrentContent(),
    ).get("foo3"),
  ).toBeUndefined();
});

test("Can create two owned objects in the same group and they will have different ids", () => {
  const { node, groupCore } = newGroup();

  const childObject1 = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childObject2 = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  expect(childObject1.id).not.toEqual(childObject2.id);
});

test("Admins can create an adminInvite, which can add an admin", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "adminInvite", "trusting");

  expect(group.get(inviteID)).toEqual("adminInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedAdminSecret = Crypto.newRandomAgentSecret();
  const invitedAdminID = Crypto.getAgentID(invitedAdminSecret);

  groupAsInvite.set(invitedAdminID, "admin", "trusting");

  expect(groupAsInvite.get(invitedAdminID)).toEqual("admin");

  const readKeyAsInvite = groupAsInvite.core.getCurrentReadKey();

  expect(readKeyAsInvite.secret).toBeDefined();

  const revelation2 = Crypto.seal({
    message: readKeyAsInvite.secret!,
    from: Crypto.getAgentSealerSecret(invitedAdminSecret),
    to: Crypto.getAgentSealerID(invitedAdminID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupAsInvite.set(
    `${readKeyAsInvite.id}_for_${invitedAdminID}`,
    revelation2,
    "trusting",
  );

  expect(
    groupAsInvite.get(`${readKeyAsInvite.id}_for_${invitedAdminID}`),
  ).toEqual(revelation2);
});

test("Admins can create an adminInvite, which can add an admin (high-level)", async () => {
  const { node, group } = newGroupHighLevel();

  const inviteSecret = group.createInvite("admin");

  const invitedAdminSecret = Crypto.newRandomAgentSecret();
  const invitedAdminID = Crypto.getAgentID(invitedAdminSecret);

  const nodeAsInvitedAdmin = node.testWithDifferentAccount(
    new ControlledAgent(invitedAdminSecret, Crypto),
    Crypto.newRandomSessionID(invitedAdminID),
  );

  await nodeAsInvitedAdmin.acceptInvite(group.id, inviteSecret);

  const thirdAdmin = Crypto.newRandomAgentSecret();
  const thirdAdminID = Crypto.getAgentID(thirdAdmin);

  const groupAsInvitedAdmin = await nodeAsInvitedAdmin.load(group.id);
  if (groupAsInvitedAdmin === "unavailable") {
    throw new Error("groupAsInvitedAdmin is unavailable");
  }

  expect(groupAsInvitedAdmin.get(invitedAdminID)).toEqual("admin");
  expect(groupAsInvitedAdmin.core.getCurrentReadKey().secret).toBeDefined();

  groupAsInvitedAdmin.addMemberInternal(thirdAdminID, "admin");

  expect(groupAsInvitedAdmin.get(thirdAdminID)).toEqual("admin");
});

test("Admins can create a writerInvite, which can add a writer", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "writerInvite", "trusting");

  expect(group.get(inviteID)).toEqual("writerInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedWriterSecret = Crypto.newRandomAgentSecret();
  const invitedWriterID = Crypto.getAgentID(invitedWriterSecret);

  groupAsInvite.set(invitedWriterID, "writer", "trusting");

  expect(groupAsInvite.get(invitedWriterID)).toEqual("writer");

  const readKeyAsInvite = groupAsInvite.core.getCurrentReadKey();

  expect(readKeyAsInvite.secret).toBeDefined();

  const revelation2 = Crypto.seal({
    message: readKeyAsInvite.secret!,
    from: Crypto.getAgentSealerSecret(invitedWriterSecret),
    to: Crypto.getAgentSealerID(invitedWriterID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  groupAsInvite.set(
    `${readKeyAsInvite.id}_for_${invitedWriterID}`,
    revelation2,
    "trusting",
  );

  expect(
    groupAsInvite.get(`${readKeyAsInvite.id}_for_${invitedWriterID}`),
  ).toEqual(revelation2);
});

test("Admins can create a writerInvite, which can add a writer (high-level)", async () => {
  const { node, group } = newGroupHighLevel();

  const inviteSecret = group.createInvite("writer");

  const invitedWriterSecret = Crypto.newRandomAgentSecret();
  const invitedWriterID = Crypto.getAgentID(invitedWriterSecret);

  const nodeAsInvitedWriter = node.testWithDifferentAccount(
    new ControlledAgent(invitedWriterSecret, Crypto),
    Crypto.newRandomSessionID(invitedWriterID),
  );

  await nodeAsInvitedWriter.acceptInvite(group.id, inviteSecret);

  const groupAsInvitedWriter = await nodeAsInvitedWriter.load(group.id);
  if (groupAsInvitedWriter === "unavailable") {
    throw new Error("groupAsInvitedAdmin is unavailable");
  }

  expect(groupAsInvitedWriter.get(invitedWriterID)).toEqual("writer");
  expect(groupAsInvitedWriter.core.getCurrentReadKey().secret).toBeDefined();
});

test("Admins can create a readerInvite, which can add a reader", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "readerInvite", "trusting");

  expect(group.get(inviteID)).toEqual("readerInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedReaderSecret = Crypto.newRandomAgentSecret();
  const invitedReaderID = Crypto.getAgentID(invitedReaderSecret);

  groupAsInvite.set(invitedReaderID, "reader", "trusting");

  expect(groupAsInvite.get(invitedReaderID)).toEqual("reader");

  const readKeyAsInvite = groupAsInvite.core.getCurrentReadKey();

  expect(readKeyAsInvite.secret).toBeDefined();

  groupAsInvite.set(
    `${readKeyAsInvite.id}_for_${invitedReaderID}`,
    revelation,
    "trusting",
  );

  expect(
    groupAsInvite.get(`${readKeyAsInvite.id}_for_${invitedReaderID}`),
  ).toEqual(revelation);
});

test("Admins can create a readerInvite, which can add a reader (high-level)", async () => {
  const { node, group } = newGroupHighLevel();

  const inviteSecret = group.createInvite("reader");

  const invitedReaderSecret = Crypto.newRandomAgentSecret();
  const invitedReaderID = Crypto.getAgentID(invitedReaderSecret);

  const nodeAsInvitedReader = node.testWithDifferentAccount(
    new ControlledAgent(invitedReaderSecret, Crypto),
    Crypto.newRandomSessionID(invitedReaderID),
  );

  await nodeAsInvitedReader.acceptInvite(group.id, inviteSecret);

  const groupAsInvitedReader = await nodeAsInvitedReader.load(group.id);
  if (groupAsInvitedReader === "unavailable") {
    throw new Error("groupAsInvitedAdmin is unavailable");
  }

  expect(groupAsInvitedReader.get(invitedReaderID)).toEqual("reader");
  expect(groupAsInvitedReader.core.getCurrentReadKey().secret).toBeDefined();
});

test("WriterInvites can not invite admins", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "writerInvite", "trusting");

  expect(group.get(inviteID)).toEqual("writerInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedAdminSecret = Crypto.newRandomAgentSecret();
  const invitedAdminID = Crypto.getAgentID(invitedAdminSecret);

  groupAsInvite.set(invitedAdminID, "admin", "trusting");
  expect(groupAsInvite.get(invitedAdminID)).toBeUndefined();
});

test("ReaderInvites can not invite admins", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "readerInvite", "trusting");

  expect(group.get(inviteID)).toEqual("readerInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedAdminSecret = Crypto.newRandomAgentSecret();
  const invitedAdminID = Crypto.getAgentID(invitedAdminSecret);

  groupAsInvite.set(invitedAdminID, "admin", "trusting");
  expect(groupAsInvite.get(invitedAdminID)).toBeUndefined();
});

test("ReaderInvites can not invite writers", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "readerInvite", "trusting");

  expect(group.get(inviteID)).toEqual("readerInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedWriterSecret = Crypto.newRandomAgentSecret();
  const invitedWriterID = Crypto.getAgentID(invitedWriterSecret);

  groupAsInvite.set(invitedWriterID, "writer", "trusting");
  expect(groupAsInvite.get(invitedWriterID)).toBeUndefined();
});

test("WriteOnlyInvites can not invite writers", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "writeOnlyInvite", "trusting");

  expect(group.get(inviteID)).toEqual("writeOnlyInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedWriterSecret = Crypto.newRandomAgentSecret();
  const invitedWriterID = Crypto.getAgentID(invitedWriterSecret);

  groupAsInvite.set(invitedWriterID, "writer", "trusting");
  expect(groupAsInvite.get(invitedWriterID)).toBeUndefined();
});

test("WriteOnlyInvites can not invite admins", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "writeOnlyInvite", "trusting");

  expect(group.get(inviteID)).toEqual("writeOnlyInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedWriterSecret = Crypto.newRandomAgentSecret();
  const invitedWriterID = Crypto.getAgentID(invitedWriterSecret);

  groupAsInvite.set(invitedWriterID, "admin", "trusting");
  expect(groupAsInvite.get(invitedWriterID)).toBeUndefined();
});

test("WriteOnlyInvites can invite writeOnly", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "writeOnlyInvite", "trusting");

  expect(group.get(inviteID)).toEqual("writeOnlyInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  const invitedWriterSecret = Crypto.newRandomAgentSecret();
  const invitedWriterID = Crypto.getAgentID(invitedWriterSecret);

  groupAsInvite.set(invitedWriterID, "writeOnly", "trusting");
  expect(groupAsInvite.get(invitedWriterID)).toEqual("writeOnly");
});

test("WriteOnlyInvites can set writeKeys", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "writeOnlyInvite", "trusting");

  expect(group.get(inviteID)).toEqual("writeOnlyInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  groupAsInvite.set(`writeKeyFor_${admin.id}`, readKeyID, "trusting");
  expect(groupAsInvite.get(`writeKeyFor_${admin.id}`)).toEqual(readKeyID);
});

test("Invites can't override key revelations", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "readerInvite", "trusting");

  expect(group.get(inviteID)).toEqual("readerInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  groupAsInvite.set(
    `${readKeyID}_for_${admin.id}`,
    "Evil change" as any,
    "trusting",
  );
  expect(groupAsInvite.get(`${readKeyID}_for_${admin.id}`)).toBe(revelation);
});

test("WriteOnlyInvites can't override writeKeys", () => {
  const { groupCore, admin } = newGroup();

  const inviteSecret = Crypto.newRandomAgentSecret();
  const inviteID = Crypto.getAgentID(inviteSecret);

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  const revelation = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: admin.currentSealerID()._unsafeUnwrap(),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${admin.id}`, revelation, "trusting");
  group.set("readKey", readKeyID, "trusting");

  group.set(inviteID, "writeOnlyInvite", "trusting");

  expect(group.get(inviteID)).toEqual("writeOnlyInvite");

  const revelationForInvite = Crypto.seal({
    message: readKey,
    from: admin.currentSealerSecret(),
    to: Crypto.getAgentSealerID(inviteID),
    nOnceMaterial: {
      in: groupCore.id,
      tx: groupCore.nextTransactionID(),
    },
  });

  group.set(`${readKeyID}_for_${inviteID}`, revelationForInvite, "trusting");

  const groupAsInvite = expectGroup(
    groupCore
      .testWithDifferentAccount(
        new ControlledAgent(inviteSecret, Crypto),
        Crypto.newRandomSessionID(inviteID),
      )
      .getCurrentContent(),
  );

  groupAsInvite.set(`writeKeyFor_${admin.id}`, readKeyID, "trusting");
  groupAsInvite.set(
    `writeKeyFor_${admin.id}`,
    "Evil change" as any,
    "trusting",
  );
  expect(groupAsInvite.get(`writeKeyFor_${admin.id}`)).toEqual(readKeyID);
});

test("Can give read permission to 'everyone'", () => {
  const { node, groupCore } = newGroup();

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  group.set("everyone", "reader", "trusting");
  group.set("readKey", readKeyID, "trusting");
  group.set(`${readKeyID}_for_everyone`, readKey, "trusting");

  const childContent = expectMap(childObject.getCurrentContent());

  expect(childContent.get("foo")).toBeUndefined();

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  const newAccount = new ControlledAgent(Crypto.newRandomAgentSecret(), Crypto);

  const childContent2 = expectMap(
    childObject
      .testWithDifferentAccount(
        newAccount,
        Crypto.newRandomSessionID(newAccount.currentAgentID()._unsafeUnwrap()),
      )
      .getCurrentContent(),
  );

  expect(childContent2.get("foo")).toEqual("bar");
});

test("Can give read permissions to 'everyone' (high-level)", async () => {
  const { group } = newGroupHighLevel();

  const childObject = group.createMap();

  expect(childObject.get("foo")).toBeUndefined();

  group.addMember("everyone", "reader");

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");

  const newAccount = new ControlledAgent(Crypto.newRandomAgentSecret(), Crypto);

  const childContent2 = expectMap(
    childObject.core
      .testWithDifferentAccount(
        new ControlledAgent(Crypto.newRandomAgentSecret(), Crypto),
        Crypto.newRandomSessionID(newAccount.currentAgentID()._unsafeUnwrap()),
      )
      .getCurrentContent(),
  );

  expect(childContent2.get("foo")).toEqual("bar");
});

test("Can give write permission to 'everyone'", async () => {
  const { node, groupCore } = newGroup();

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: groupCore.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const group = expectGroup(groupCore.getCurrentContent());

  const { secret: readKey, id: readKeyID } = Crypto.newRandomKeySecret();
  group.set("everyone", "writer", "trusting");
  group.set("readKey", readKeyID, "trusting");
  group.set(`${readKeyID}_for_everyone`, readKey, "trusting");

  const childContent = expectMap(childObject.getCurrentContent());

  expect(childContent.get("foo")).toBeUndefined();

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  const newAccount = new ControlledAgent(Crypto.newRandomAgentSecret(), Crypto);

  const childContent2 = expectMap(
    childObject
      .testWithDifferentAccount(
        newAccount,
        Crypto.newRandomSessionID(newAccount.currentAgentID()._unsafeUnwrap()),
      )
      .getCurrentContent(),
  );

  // TODO: resolve race condition
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(childContent2.get("foo")).toEqual("bar");

  childContent2.set("foo", "bar2", "private");
  expect(childContent2.get("foo")).toEqual("bar2");
});

test("Can give write permissions to 'everyone' (high-level)", async () => {
  const { group } = newGroupHighLevel();

  const childObject = group.createMap();

  expect(childObject.get("foo")).toBeUndefined();

  group.addMember("everyone", "writer");

  childObject.set("foo", "bar", "private");
  expect(childObject.get("foo")).toEqual("bar");

  const newAccount = new ControlledAgent(Crypto.newRandomAgentSecret(), Crypto);

  const childContent2 = expectMap(
    childObject.core
      .testWithDifferentAccount(
        newAccount,
        Crypto.newRandomSessionID(newAccount.currentAgentID()._unsafeUnwrap()),
      )
      .getCurrentContent(),
  );

  expect(childContent2.get("foo")).toEqual("bar");

  console.log("Before anon set");
  childContent2.set("foo", "bar2", "private");
  expect(childContent2.get("foo")).toEqual("bar2");
});

test("Admins can set parent extensions", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  group.set(`parent_${parentGroup.id}`, "extend", "trusting");
  expect(group.get(`parent_${parentGroup.id}`)).toEqual("extend");
});

test("Writers, readers and invitees can not set parent extensions", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  const writer = node.createAccount();
  const reader = node.createAccount();
  const adminInvite = node.createAccount();
  const writerInvite = node.createAccount();
  const readerInvite = node.createAccount();

  group.addMember(writer, "writer");
  group.addMember(reader, "reader");
  group.addMember(adminInvite, "adminInvite");
  group.addMember(writerInvite, "writerInvite");
  group.addMember(readerInvite, "readerInvite");

  const groupAsWriter = expectGroup(
    group.core
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  groupAsWriter.set(`parent_${parentGroup.id}`, "extend", "trusting");
  expect(groupAsWriter.get(`parent_${parentGroup.id}`)).toBeUndefined();

  const groupAsReader = expectGroup(
    group.core
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  groupAsReader.set(`parent_${parentGroup.id}`, "extend", "trusting");
  expect(groupAsReader.get(`parent_${parentGroup.id}`)).toBeUndefined();

  const groupAsAdminInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        adminInvite,
        Crypto.newRandomSessionID(adminInvite.currentAgentID()._unsafeUnwrap()),
      )
      .getCurrentContent(),
  );

  groupAsAdminInvite.set(`parent_${parentGroup.id}`, "extend", "trusting");
  expect(groupAsAdminInvite.get(`parent_${parentGroup.id}`)).toBeUndefined();

  const groupAsWriterInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        writerInvite,
        Crypto.newRandomSessionID(
          writerInvite.currentAgentID()._unsafeUnwrap(),
        ),
      )
      .getCurrentContent(),
  );

  groupAsWriterInvite.set(`parent_${parentGroup.id}`, "extend", "trusting");
  expect(groupAsWriterInvite.get(`parent_${parentGroup.id}`)).toBeUndefined();

  const groupAsReaderInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        readerInvite,
        Crypto.newRandomSessionID(
          readerInvite.currentAgentID()._unsafeUnwrap(),
        ),
      )
      .getCurrentContent(),
  );

  groupAsReaderInvite.set(`parent_${parentGroup.id}`, "extend", "trusting");
  expect(groupAsReaderInvite.get(`parent_${parentGroup.id}`)).toBeUndefined();
});

test("Admins can set child extensions", () => {
  const { group, node } = newGroupHighLevel();
  const childGroup = node.createGroup();

  group.set(`child_${childGroup.id}`, "extend", "trusting");
  expect(group.get(`child_${childGroup.id}`)).toEqual("extend");
});

test("Admins can set child extensions when the admin role is inherited", async () => {
  const { node1, node2 } = await createTwoConnectedNodes("server", "server");

  const node2AccountOnNode1 = await loadCoValueOrFail(
    node1.node,
    node2.accountID,
  );

  const group = node1.node.createGroup();

  group.addMember(node2AccountOnNode1, "admin");

  const groupOnNode2 = await loadCoValueOrFail(node2.node, group.id);

  const childGroup = node2.node.createGroup();
  childGroup.extend(groupOnNode2);

  const childGroupOnNode1 = await loadCoValueOrFail(node1.node, childGroup.id);

  const grandChildGroup = node2.node.createGroup();
  grandChildGroup.extend(childGroupOnNode1);

  expect(childGroupOnNode1.get(`child_${grandChildGroup.id}`)).toEqual(
    "extend",
  );
  expect(grandChildGroup.get(`parent_${childGroupOnNode1.id}`)).toEqual(
    "extend",
  );
});

test("Writers, readers and writeOnly can set child extensions", () => {
  const { group, node } = newGroupHighLevel();
  const childGroup = node.createGroup();

  const writer = node.createAccount();
  const reader = node.createAccount();
  const writeOnly = node.createAccount();

  group.addMember(writer, "writer");
  group.addMember(reader, "reader");
  group.addMember(writeOnly, "writeOnly");

  const groupAsWriter = expectGroup(
    group.core
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  groupAsWriter.set(`child_${childGroup.id}`, "extend", "trusting");
  expect(groupAsWriter.get(`child_${childGroup.id}`)).toEqual("extend");

  const groupAsReader = expectGroup(
    group.core
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  groupAsReader.set(`child_${childGroup.id}`, "extend", "trusting");
  expect(groupAsReader.get(`child_${childGroup.id}`)).toEqual("extend");
});

test("Invitees can not set child extensions", () => {
  const { group, node } = newGroupHighLevel();
  const childGroup = node.createGroup();

  const adminInvite = node.createAccount();
  const writerInvite = node.createAccount();
  const readerInvite = node.createAccount();

  group.addMember(adminInvite, "adminInvite");
  group.addMember(writerInvite, "writerInvite");
  group.addMember(readerInvite, "readerInvite");

  const groupAsAdminInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        adminInvite,
        Crypto.newRandomSessionID(adminInvite.currentAgentID()._unsafeUnwrap()),
      )
      .getCurrentContent(),
  );

  groupAsAdminInvite.set(`child_${childGroup.id}`, "extend", "trusting");
  expect(groupAsAdminInvite.get(`child_${childGroup.id}`)).toBeUndefined();

  const groupAsWriterInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        writerInvite,
        Crypto.newRandomSessionID(
          writerInvite.currentAgentID()._unsafeUnwrap(),
        ),
      )
      .getCurrentContent(),
  );

  groupAsWriterInvite.set(`child_${childGroup.id}`, "extend", "trusting");
  expect(groupAsWriterInvite.get(`child_${childGroup.id}`)).toBeUndefined();

  const groupAsReaderInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        readerInvite,
        Crypto.newRandomSessionID(
          readerInvite.currentAgentID()._unsafeUnwrap(),
        ),
      )
      .getCurrentContent(),
  );

  groupAsReaderInvite.set(`child_${childGroup.id}`, "extend", "trusting");
  expect(groupAsReaderInvite.get(`child_${childGroup.id}`)).toBeUndefined();
});

test("Member roles are inherited by child groups (except invites)", () => {
  const { group, node, admin } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  group.set(`parent_${parentGroup.id}`, "extend", "trusting");

  const writer = node.createAccount();
  const reader = node.createAccount();
  const adminInvite = node.createAccount();
  const writerInvite = node.createAccount();
  const readerInvite = node.createAccount();

  parentGroup.addMember(writer, "writer");
  parentGroup.addMember(reader, "reader");
  parentGroup.addMember(adminInvite, "adminInvite");
  parentGroup.addMember(writerInvite, "writerInvite");
  parentGroup.addMember(readerInvite, "readerInvite");

  expect(group.roleOfInternal(admin.id)).toEqual({
    role: "admin",
    via: undefined,
  });

  expect(group.roleOfInternal(writer.id)).toEqual({
    role: "writer",
    via: parentGroup.id,
  });
  expect(group.roleOf(writer.id)).toEqual("writer");

  expect(group.roleOfInternal(reader.id)).toEqual({
    role: "reader",
    via: parentGroup.id,
  });
  expect(group.roleOf(reader.id)).toEqual("reader");

  expect(group.roleOfInternal(adminInvite.id)).toEqual(undefined);
  expect(group.roleOf(adminInvite.id)).toEqual(undefined);

  expect(group.roleOfInternal(writerInvite.id)).toEqual(undefined);
  expect(group.roleOf(writerInvite.id)).toEqual(undefined);

  expect(group.roleOfInternal(readerInvite.id)).toEqual(undefined);
  expect(group.roleOf(readerInvite.id)).toEqual(undefined);
});

test("Member roles are inherited by grand-children groups (except invites)", () => {
  const { group, node, admin } = newGroupHighLevel();
  const parentGroup = node.createGroup();
  const grandParentGroup = node.createGroup();

  group.set(`parent_${parentGroup.id}`, "extend", "trusting");
  parentGroup.set(`parent_${grandParentGroup.id}`, "extend", "trusting");

  const writer = node.createAccount();
  const reader = node.createAccount();
  const adminInvite = node.createAccount();
  const writerInvite = node.createAccount();
  const readerInvite = node.createAccount();

  grandParentGroup.addMember(writer, "writer");
  grandParentGroup.addMember(reader, "reader");
  grandParentGroup.addMember(adminInvite, "adminInvite");
  grandParentGroup.addMember(writerInvite, "writerInvite");
  grandParentGroup.addMember(readerInvite, "readerInvite");

  expect(group.roleOfInternal(admin.id)).toEqual({
    role: "admin",
    via: undefined,
  });

  expect(group.roleOfInternal(writer.id)).toEqual({
    role: "writer",
    via: parentGroup.id,
  });
  expect(group.roleOf(writer.id)).toEqual("writer");

  expect(group.roleOfInternal(reader.id)).toEqual({
    role: "reader",
    via: parentGroup.id,
  });
  expect(group.roleOf(reader.id)).toEqual("reader");

  expect(group.roleOfInternal(adminInvite.id)).toEqual(undefined);
  expect(group.roleOf(adminInvite.id)).toEqual(undefined);

  expect(group.roleOfInternal(writerInvite.id)).toEqual(undefined);
  expect(group.roleOf(writerInvite.id)).toEqual(undefined);

  expect(group.roleOfInternal(readerInvite.id)).toEqual(undefined);
  expect(group.roleOf(readerInvite.id)).toEqual(undefined);
});

test("Admins can reveal parent read keys to child groups", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  const parentReadKeyID = parentGroup.get("readKey");
  if (!parentReadKeyID) {
    throw new Error("Can't get parent group read key");
  }

  const readKeyID = group.get("readKey");
  if (!readKeyID) {
    throw new Error("Can't get group read key");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encrypted = "fake_encrypted_key_secret" as any;

  group.set(`${readKeyID}_for_${parentReadKeyID}`, encrypted, "trusting");
  expect(group.get(`${readKeyID}_for_${parentReadKeyID}`)).toEqual(encrypted);
});

test("Writers, readers and invites can't reveal parent read keys to child groups", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  const parentReadKeyID = parentGroup.get("readKey");
  if (!parentReadKeyID) {
    throw new Error("Can't get parent group read key");
  }

  const readKeyID = group.get("readKey");
  if (!readKeyID) {
    throw new Error("Can't get group read key");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encrypted = "fake_encrypted_key_secret" as any;

  const writer = node.createAccount();
  const reader = node.createAccount();
  const adminInvite = node.createAccount();
  const writerInvite = node.createAccount();
  const readerInvite = node.createAccount();

  group.addMember(writer, "writer");
  group.addMember(reader, "reader");
  group.addMember(adminInvite, "adminInvite");
  group.addMember(writerInvite, "writerInvite");
  group.addMember(readerInvite, "readerInvite");

  const groupAsWriter = expectGroup(
    group.core
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  groupAsWriter.set(
    `${readKeyID}_for_${parentReadKeyID}`,
    encrypted,
    "trusting",
  );
  expect(
    groupAsWriter.get(`${readKeyID}_for_${parentReadKeyID}`),
  ).toBeUndefined();

  const groupAsReader = expectGroup(
    group.core
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  groupAsReader.set(
    `${readKeyID}_for_${parentReadKeyID}`,
    encrypted,
    "trusting",
  );
  expect(
    groupAsReader.get(`${readKeyID}_for_${parentReadKeyID}`),
  ).toBeUndefined();

  const groupAsAdminInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        adminInvite,
        Crypto.newRandomSessionID(adminInvite.currentAgentID()._unsafeUnwrap()),
      )
      .getCurrentContent(),
  );

  groupAsAdminInvite.set(
    `${readKeyID}_for_${parentReadKeyID}`,
    encrypted,
    "trusting",
  );
  expect(
    groupAsAdminInvite.get(`${readKeyID}_for_${parentReadKeyID}`),
  ).toBeUndefined();

  const groupAsWriterInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        writerInvite,
        Crypto.newRandomSessionID(
          writerInvite.currentAgentID()._unsafeUnwrap(),
        ),
      )
      .getCurrentContent(),
  );

  groupAsWriterInvite.set(
    `${readKeyID}_for_${parentReadKeyID}`,
    encrypted,
    "trusting",
  );
  expect(
    groupAsWriterInvite.get(`${readKeyID}_for_${parentReadKeyID}`),
  ).toBeUndefined();

  const groupAsReaderInvite = expectGroup(
    group.core
      .testWithDifferentAccount(
        readerInvite,
        Crypto.newRandomSessionID(
          readerInvite.currentAgentID()._unsafeUnwrap(),
        ),
      )
      .getCurrentContent(),
  );

  groupAsReaderInvite.set(
    `${readKeyID}_for_${parentReadKeyID}`,
    encrypted,
    "trusting",
  );
  expect(
    groupAsReaderInvite.get(`${readKeyID}_for_${parentReadKeyID}`),
  ).toBeUndefined();
});

test("Writers and readers in a parent group can read from an object owned by a child group", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  group.set(`parent_${parentGroup.id}`, "extend", "trusting");

  const parentReadKeyID = parentGroup.get("readKey");
  const parentKey =
    parentReadKeyID && parentGroup.core.getReadKey(parentReadKeyID);
  if (!parentReadKeyID || !parentKey) {
    throw new Error("Can't get parent group read key");
  }

  const readKeyID = group.get("readKey");
  const readKey = readKeyID && group.core.getReadKey(readKeyID);
  if (!readKeyID || !readKey) {
    throw new Error("Can't get group read key");
  }

  const encrypted = node.crypto.encryptKeySecret({
    toEncrypt: {
      id: readKeyID,
      secret: readKey,
    },
    encrypting: {
      id: parentReadKeyID,
      secret: parentKey,
    },
  }).encrypted;

  group.set(`${readKeyID}_for_${parentReadKeyID}`, encrypted, "trusting");

  const writer = node.createAccount();
  const reader = node.createAccount();
  parentGroup.addMember(writer, "writer");
  parentGroup.addMember(reader, "reader");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: group.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childContent = expectMap(childObject.getCurrentContent());

  childContent.set("foo", "bar", "private");
  expect(childContent.get("foo")).toEqual("bar");

  const childContentAsWriter = expectMap(
    childObject
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  expect(childContentAsWriter.get("foo")).toEqual("bar");

  const childContentAsReader = expectMap(
    childObject
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader.get("foo")).toEqual("bar");
});

test("Writers in a parent group can write to an object owned by a child group", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  group.set(`parent_${parentGroup.id}`, "extend", "trusting");

  const parentReadKeyID = parentGroup.get("readKey");
  const parentKey =
    parentReadKeyID && parentGroup.core.getReadKey(parentReadKeyID);
  if (!parentReadKeyID || !parentKey) {
    throw new Error("Can't get parent group read key");
  }

  const readKeyID = group.get("readKey");
  const readKey = readKeyID && group.core.getReadKey(readKeyID);
  if (!readKeyID || !readKey) {
    throw new Error("Can't get group read key");
  }

  const encrypted = node.crypto.encryptKeySecret({
    toEncrypt: {
      id: readKeyID,
      secret: readKey,
    },
    encrypting: {
      id: parentReadKeyID,
      secret: parentKey,
    },
  }).encrypted;

  group.set(`${readKeyID}_for_${parentReadKeyID}`, encrypted, "trusting");

  const writer = node.createAccount();
  parentGroup.addMember(writer, "writer");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: group.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const childContentAsWriter = expectMap(
    childObject
      .testWithDifferentAccount(writer, Crypto.newRandomSessionID(writer.id))
      .getCurrentContent(),
  );

  childContentAsWriter.set("foo", "bar", "private");
  expect(childContentAsWriter.get("foo")).toEqual("bar");
});

test("When rotating the key of a child group, the new child key is exposed to the parent group", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  group.set(`parent_${parentGroup.id}`, "extend", "trusting");

  const currentReadKeyID = group.get("readKey");
  if (!currentReadKeyID) {
    throw new Error("Can't get group read key");
  }

  group.rotateReadKey();

  const newReadKeyID = group.get("readKey");
  if (!newReadKeyID) {
    throw new Error("Can't get new group read key");
  }
  expect(newReadKeyID).not.toEqual(currentReadKeyID);

  const parentReadKeyID = parentGroup.get("readKey");
  if (!parentReadKeyID) {
    throw new Error("Can't get parent group read key");
  }

  console.log("Checking", `${newReadKeyID}_for_${parentReadKeyID}`);

  expect(group.get(`${newReadKeyID}_for_${parentReadKeyID}`)).toBeDefined();
});

test("When rotating the key of a parent group, the keys of all child groups are also rotated", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  parentGroup.set(`child_${group.id}`, "extend", "trusting");
  group.set(`parent_${parentGroup.id}`, "extend", "trusting");

  group.rotateReadKey();

  const currentChildReadKeyID = group.get("readKey");
  if (!currentChildReadKeyID) {
    throw new Error("Can't get group read key");
  }

  console.log("child id", group.id);
  parentGroup.rotateReadKey();

  const newChildReadKeyID = expectGroup(group.core.getCurrentContent()).get(
    "readKey",
  );
  if (!newChildReadKeyID) {
    throw new Error("Can't get new group read key");
  }

  expect(newChildReadKeyID).not.toEqual(currentChildReadKeyID);
});

test("When rotating the key of a parent group, the old transactions should still be valid", async () => {
  const { node1, node2 } = await createTwoConnectedNodes("server", "server");

  const group = node1.node.createGroup();
  const parentGroup = node1.node.createGroup();

  group.extend(parentGroup);

  const node2AccountOnNode1 = await loadCoValueOrFail(
    node1.node,
    node2.accountID,
  );

  parentGroup.addMember(node2AccountOnNode1, "writer");

  const map = group.createMap();
  map.set("from", "node1", "private");

  const mapOnNode2 = await loadCoValueOrFail(node2.node, map.id);
  mapOnNode2.set("from", "node2", "private");

  await new Promise((resolve) => setTimeout(resolve, 10));

  parentGroup.removeMember(node2AccountOnNode1);

  await new Promise((resolve) => setTimeout(resolve, 10));

  const mapOnNode1 = await loadCoValueOrFail(node1.node, map.id);

  expect(mapOnNode1.get("from")).toEqual("node2");
});

test("When rotating the key of a grand-parent group, the keys of all child and grand-child groups are also rotated", () => {
  const { group, node } = newGroupHighLevel();
  const grandParentGroup = node.createGroup();
  const parentGroup = node.createGroup();

  grandParentGroup.set(`child_${parentGroup.id}`, "extend", "trusting");
  parentGroup.set(`child_${group.id}`, "extend", "trusting");
  parentGroup.set(`parent_${grandParentGroup.id}`, "extend", "trusting");
  group.set(`parent_${grandParentGroup.id}`, "extend", "trusting");

  const currentGrandParentReadKeyID = grandParentGroup.get("readKey");
  if (!currentGrandParentReadKeyID) {
    throw new Error("Can't get grand-parent group read key");
  }

  const currentParentReadKeyID = parentGroup.get("readKey");
  if (!currentParentReadKeyID) {
    throw new Error("Can't get parent group read key");
  }

  const currentChildReadKeyID = group.get("readKey");
  if (!currentChildReadKeyID) {
    throw new Error("Can't get group read key");
  }

  grandParentGroup.rotateReadKey();

  const newGrandParentReadKeyID = grandParentGroup.get("readKey");
  if (!newGrandParentReadKeyID) {
    throw new Error("Can't get new grand-parent group read key");
  }

  expect(newGrandParentReadKeyID).not.toEqual(currentGrandParentReadKeyID);

  const newParentReadKeyID = expectGroup(
    parentGroup.core.getCurrentContent(),
  ).get("readKey");
  if (!newParentReadKeyID) {
    throw new Error("Can't get new parent group read key");
  }

  expect(newParentReadKeyID).not.toEqual(currentParentReadKeyID);

  const newChildReadKeyID = expectGroup(group.core.getCurrentContent()).get(
    "readKey",
  );
  if (!newChildReadKeyID) {
    throw new Error("Can't get new group read key");
  }

  expect(newChildReadKeyID).not.toEqual(currentChildReadKeyID);
});

test("Calling extend on group sets up parent and child references and reveals child key to parent", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  group.extend(parentGroup);

  expect(group.get(`parent_${parentGroup.id}`)).toEqual("extend");
  expect(parentGroup.get(`child_${group.id}`)).toEqual("extend");

  const parentReadKeyID = parentGroup.get("readKey");
  if (!parentReadKeyID) {
    throw new Error("Can't get parent group read key");
  }

  const childReadKeyID = group.get("readKey");
  if (!childReadKeyID) {
    throw new Error("Can't get group read key");
  }

  expect(group.get(`${childReadKeyID}_for_${parentReadKeyID}`)).toBeDefined();

  const reader = node.createAccount();
  parentGroup.addMember(reader, "reader");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: group.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });
  const childMap = expectMap(childObject.getCurrentContent());

  childMap.set("foo", "bar", "private");

  const childContentAsReader = expectMap(
    childObject
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader.get("foo")).toEqual("bar");
});

test("Calling extend to create grand-child groups parent and child references and reveals child key to parent(s)", () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();
  const grandParentGroup = node.createGroup();

  group.extend(parentGroup);
  parentGroup.extend(grandParentGroup);

  expect(group.get(`parent_${parentGroup.id}`)).toEqual("extend");
  expect(parentGroup.get(`parent_${grandParentGroup.id}`)).toEqual("extend");
  expect(parentGroup.get(`child_${group.id}`)).toEqual("extend");
  expect(grandParentGroup.get(`child_${parentGroup.id}`)).toEqual("extend");

  const reader = node.createAccount();
  grandParentGroup.addMember(reader, "reader");

  const childObject = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: group.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });
  const childMap = expectMap(childObject.getCurrentContent());

  childMap.set("foo", "bar", "private");

  const childContentAsReader = expectMap(
    childObject
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(childContentAsReader.get("foo")).toEqual("bar");
});

test("High-level permissions work correctly when a group is extended", async () => {
  const { group, node } = newGroupHighLevel();
  const parentGroup = node.createGroup();

  group.extend(parentGroup);

  const reader = node.createAccount();
  parentGroup.addMember(reader, "reader");

  const mapCore = node.createCoValue({
    type: "comap",
    ruleset: { type: "ownedByGroup", group: group.id },
    meta: null,
    ...Crypto.createdNowUnique(),
  });

  const map = expectMap(mapCore.getCurrentContent());

  map.set("foo", "bar", "private");

  const mapAsReader = expectMap(
    mapCore
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(mapAsReader.get("foo")).toEqual("bar");

  const groupKeyBeforeRemove = group.core.getCurrentReadKey().id;

  await parentGroup.removeMember(reader);

  const groupKeyAfterRemove = group.core.getCurrentReadKey().id;
  expect(groupKeyAfterRemove).not.toEqual(groupKeyBeforeRemove);

  map.set("foo", "baz", "private");

  const mapAsReaderAfterRemove = expectMap(
    mapCore
      .testWithDifferentAccount(reader, Crypto.newRandomSessionID(reader.id))
      .getCurrentContent(),
  );

  expect(mapAsReaderAfterRemove.get("foo")).not.toEqual("baz");
});

test("self-extensions should not break the permissions checks", () => {
  const { group, node } = newGroupHighLevel();

  group.set(`child_${group.id}`, "extend", "trusting");
  group.set(`parent_${group.id}`, "extend", "trusting");

  const map = group.createMap();
  map.set("test", "Hello!");

  expect(map.get("test")).toEqual("Hello!");
});
