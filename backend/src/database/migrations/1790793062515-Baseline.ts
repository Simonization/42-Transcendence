import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1790793062515 implements MigrationInterface {
    name = 'Baseline1790793062515'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_profiles" (
                "user_id" integer NOT NULL,
                "display_name" character varying,
                "avatar_url" character varying,
                "bio" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6ca9503d77ae39b4b5a6cc3ba88" PRIMARY KEY ("user_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "user_settings" (
                "user_id" integer NOT NULL,
                "language" character varying(10) NOT NULL DEFAULT 'en',
                "timezone" character varying(50),
                "theme" smallint NOT NULL DEFAULT '0',
                "openMessage" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4ed056b9344e6f7d8d46ec4b302" PRIMARY KEY ("user_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "user_game_accounts" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "game" character varying NOT NULL,
                "game_account_id" character varying NOT NULL,
                "game_username" character varying NOT NULL,
                "region" character varying,
                "linked_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" integer,
                CONSTRAINT "PK_630e75a5ff10de1621ade463591" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_c7c60be37c4a8a257c60a6ff5f" ON "user_game_accounts" ("game", "game_account_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "friends" (
                "user1" integer NOT NULL,
                "user2" integer NOT NULL,
                "status" smallint NOT NULL DEFAULT '0',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "actionUserId" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_3e10b1567744550d0cf8c09159d" PRIMARY KEY ("user1", "user2")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_3e10b1567744550d0cf8c09159" ON "friends" ("user1", "user2")
        `);
        await queryRunner.query(`
            CREATE TABLE "user_blocks" (
                "id" SERIAL NOT NULL,
                "reason" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "blockerId" integer,
                "blockedId" integer,
                CONSTRAINT "PK_0bae5f5cab7574a84889462187c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" SERIAL NOT NULL,
                "token" character varying NOT NULL,
                "userId" integer NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" integer,
                CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "games" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "team_count" integer NOT NULL DEFAULT '2',
                "team_size" integer NOT NULL DEFAULT '1',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."users_matches_result_enum" AS ENUM('PENDING', 'WIN', 'LOSS', 'DRAW')
        `);
        await queryRunner.query(`
            CREATE TABLE "users_matches" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "match_id" integer NOT NULL,
                "team_id" integer,
                "result" "public"."users_matches_result_enum" NOT NULL DEFAULT 'PENDING',
                CONSTRAINT "PK_b35a71f7d988773555eb214d0b6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "matches" (
                "id" SERIAL NOT NULL,
                "game_id" integer,
                "tournament_id" integer,
                "phase_id" integer,
                "winner_next_match_id" integer,
                "winner_next_match_slot" integer,
                "loser_next_match_id" integer,
                "loser_next_match_slot" integer,
                "status" character varying NOT NULL DEFAULT 'WAITING',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "game_data" jsonb DEFAULT '{}',
                "winner_id" integer,
                "score" character varying,
                "round_order" integer,
                CONSTRAINT "PK_8a22c7b2e0828988d51256117f4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."tournament_phases_type_enum" AS ENUM(
                'SINGLE_ELIMINATION',
                'DOUBLE_ELIMINATION',
                'ROUND_ROBIN',
                'SWISS',
                'GROUP_STAGE'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tournament_phases" (
                "id" SERIAL NOT NULL,
                "tournament_id" integer NOT NULL,
                "order" integer NOT NULL,
                "type" "public"."tournament_phases_type_enum" NOT NULL DEFAULT 'SINGLE_ELIMINATION',
                "game_id" integer NOT NULL,
                "teams_limit_start" integer,
                "teams_limit_end" integer,
                "swiss_rounds" integer,
                "group_size" integer,
                "group_winners_count" integer,
                CONSTRAINT "PK_bdb19eec286c2074da9a6447f72" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."tournaments_status_enum" AS ENUM(
                'DRAFT',
                'REGISTRATION_OPEN',
                'ONGOING',
                'COMPLETED'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tournaments" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "max_participants" integer,
                "status" "public"."tournaments_status_enum" NOT NULL DEFAULT 'REGISTRATION_OPEN',
                "current_phase_order" integer NOT NULL DEFAULT '1',
                "active_phase_id" integer,
                "scheduledAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6d5d129da7a80cf99e8ad4833a9" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "team_admins" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "team_id" integer NOT NULL,
                "granted_by" integer NOT NULL,
                "granted_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_ab3b77456b5f14e8d137bc6ac30" UNIQUE ("user_id", "team_id"),
                CONSTRAINT "PK_308de4228e6acae4806ccaeadd1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."teams_status_enum" AS ENUM('DRAFT', 'LOCKED', 'ARCHIVED')
        `);
        await queryRunner.query(`
            CREATE TABLE "teams" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "status" "public"."teams_status_enum" NOT NULL DEFAULT 'DRAFT',
                "captain_id" integer NOT NULL,
                "tournamentId" integer,
                CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "username" character varying NOT NULL,
                "mail" character varying(100) NOT NULL,
                "password_hash" character varying NOT NULL,
                "role" smallint NOT NULL DEFAULT '0',
                "status" smallint NOT NULL DEFAULT '0',
                "ban_until" TIMESTAMP,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                "verificationToken" character varying,
                "twoFactorEnabled" boolean NOT NULL DEFAULT false,
                "twoFactorCode" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "firstName" character varying,
                "lastName" character varying,
                "avatarUrl" character varying,
                CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
                CONSTRAINT "UQ_2e5b50f4b7c081eceea476ad128" UNIQUE ("mail"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."team_invitations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED')
        `);
        await queryRunner.query(`
            CREATE TABLE "team_invitations" (
                "id" SERIAL NOT NULL,
                "team_id" integer NOT NULL,
                "sender_id" integer NOT NULL,
                "receiver_id" integer NOT NULL,
                "status" "public"."team_invitations_status_enum" NOT NULL DEFAULT 'PENDING',
                CONSTRAINT "PK_c14b443d431077f89344a3fd262" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "org_members" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "org_id" integer NOT NULL,
                "role" character varying NOT NULL DEFAULT 'member',
                "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_986db88b0e82a9189921841199b" UNIQUE ("user_id", "org_id"),
                CONSTRAINT "PK_8391a72b91725161ab2cab00be9" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "organizations" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "avatar_url" character varying,
                "owner_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_9b7ca6d30b94fef571cff876884" UNIQUE ("name"),
                CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "actor_id" integer,
                "type" character varying(50) NOT NULL,
                "title" character varying(255),
                "body" text NOT NULL,
                "data" json,
                "read_at" TIMESTAMP,
                "delivered_at" TIMESTAMP,
                "attempts" integer NOT NULL DEFAULT '0',
                "next_attempt_at" TIMESTAMP,
                "last_error" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "chat_participants" (
                "chat_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
                "last_read_at" TIMESTAMP,
                CONSTRAINT "PK_36c99e4a017767179cc49d0ac74" PRIMARY KEY ("chat_id", "user_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "chats" (
                "id" SERIAL NOT NULL,
                "type" smallint NOT NULL DEFAULT '0',
                "title" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "messages" (
                "id" SERIAL NOT NULL,
                "chat_id" integer NOT NULL,
                "sender_id" integer NOT NULL,
                "content" text NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "edited_at" TIMESTAMP,
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "admin_invites" (
                "id" SERIAL NOT NULL,
                "token_hash" character varying NOT NULL,
                "created_by_user_id" integer,
                "used_by_user_id" integer,
                "expires_at" TIMESTAMP NOT NULL,
                "used_at" TIMESTAMP,
                "is_bootstrap" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_d42c167370e061bde630b8a9284" UNIQUE ("token_hash"),
                CONSTRAINT "PK_79953c0faab15cd60084dc26486" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "match_teams" (
                "match_id" integer NOT NULL,
                "team_id" integer NOT NULL,
                CONSTRAINT "PK_03542102c151718b118f6132b22" PRIMARY KEY ("match_id", "team_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_98e38a7c7139bbda0c4f2fcb59" ON "match_teams" ("match_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b4806f0183effb3d190eef583f" ON "match_teams" ("team_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "team_members" (
                "team_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                CONSTRAINT "PK_1d3c06a8217a8785e2af0ec4ab8" PRIMARY KEY ("team_id", "user_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fdad7d5768277e60c40e01cdce" ON "team_members" ("team_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c2bf4967c8c2a6b845dadfbf3d" ON "team_members" ("user_id")
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profiles"
            ADD CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_settings"
            ADD CONSTRAINT "FK_4ed056b9344e6f7d8d46ec4b302" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_game_accounts"
            ADD CONSTRAINT "FK_02f30d1ed7a1d927b29f1d3d693" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "friends"
            ADD CONSTRAINT "FK_f2f2c18e6cb5a91e3a2e6cda3cb" FOREIGN KEY ("user1") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "friends"
            ADD CONSTRAINT "FK_2bf15b5bc266f5246f0edd42e1d" FOREIGN KEY ("user2") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_blocks"
            ADD CONSTRAINT "FK_eae09d4f95afa5ae30c28384607" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_blocks"
            ADD CONSTRAINT "FK_18d34df8212648b698828f244fb" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "users_matches"
            ADD CONSTRAINT "FK_22f8a4c8c3cbca3a419888a7653" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "users_matches"
            ADD CONSTRAINT "FK_644bad3bb13869d466177f9afa9" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "users_matches"
            ADD CONSTRAINT "FK_c5ee9e5f766df5f535bce89595b" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "matches"
            ADD CONSTRAINT "FK_721191f60100575734fb03261f3" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "matches"
            ADD CONSTRAINT "FK_4445c1b2bd39fe81088ea640acb" FOREIGN KEY ("phase_id") REFERENCES "tournament_phases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tournament_phases"
            ADD CONSTRAINT "FK_d3cd17b3f63a5b3c7cecb94bd1c" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tournament_phases"
            ADD CONSTRAINT "FK_997c8455e3dde2951b27c33335b" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tournaments"
            ADD CONSTRAINT "FK_3c1b303314881c72973ed076b12" FOREIGN KEY ("active_phase_id") REFERENCES "tournament_phases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "team_admins"
            ADD CONSTRAINT "FK_c0c96f688504d5b06c6fb9c880e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "team_admins"
            ADD CONSTRAINT "FK_07854d1c6c31d23ae3c51b1be2b" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "teams"
            ADD CONSTRAINT "FK_efa32c8850c6857db07943ae07d" FOREIGN KEY ("captain_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "teams"
            ADD CONSTRAINT "FK_f09b3fd06a61a5c842d3a8e0dee" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "team_invitations"
            ADD CONSTRAINT "FK_47d9ff0726cf20571e29480a99b" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "team_invitations"
            ADD CONSTRAINT "FK_6b4f41eca0edfba75eec4489fad" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "team_invitations"
            ADD CONSTRAINT "FK_84dcfd77b59af62935593788630" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "org_members"
            ADD CONSTRAINT "FK_220d854a7932f6aac9ed84f71c9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "org_members"
            ADD CONSTRAINT "FK_a35e7519ef33c0dd4d24bb15056" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "organizations"
            ADD CONSTRAINT "FK_e08c0b40ce104f44edf060126fe" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_participants"
            ADD CONSTRAINT "FK_9946d299e9ccfbee23aa40c5545" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_participants"
            ADD CONSTRAINT "FK_b4129b3e21906ca57b503a1d834" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "messages"
            ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "messages"
            ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "match_teams"
            ADD CONSTRAINT "FK_98e38a7c7139bbda0c4f2fcb594" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "match_teams"
            ADD CONSTRAINT "FK_b4806f0183effb3d190eef583f1" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "team_members"
            ADD CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "team_members"
            ADD CONSTRAINT "FK_c2bf4967c8c2a6b845dadfbf3d4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "team_members" DROP CONSTRAINT "FK_c2bf4967c8c2a6b845dadfbf3d4"
        `);
        await queryRunner.query(`
            ALTER TABLE "team_members" DROP CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea"
        `);
        await queryRunner.query(`
            ALTER TABLE "match_teams" DROP CONSTRAINT "FK_b4806f0183effb3d190eef583f1"
        `);
        await queryRunner.query(`
            ALTER TABLE "match_teams" DROP CONSTRAINT "FK_98e38a7c7139bbda0c4f2fcb594"
        `);
        await queryRunner.query(`
            ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"
        `);
        await queryRunner.query(`
            ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_b4129b3e21906ca57b503a1d834"
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_9946d299e9ccfbee23aa40c5545"
        `);
        await queryRunner.query(`
            ALTER TABLE "organizations" DROP CONSTRAINT "FK_e08c0b40ce104f44edf060126fe"
        `);
        await queryRunner.query(`
            ALTER TABLE "org_members" DROP CONSTRAINT "FK_a35e7519ef33c0dd4d24bb15056"
        `);
        await queryRunner.query(`
            ALTER TABLE "org_members" DROP CONSTRAINT "FK_220d854a7932f6aac9ed84f71c9"
        `);
        await queryRunner.query(`
            ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_84dcfd77b59af62935593788630"
        `);
        await queryRunner.query(`
            ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_6b4f41eca0edfba75eec4489fad"
        `);
        await queryRunner.query(`
            ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_47d9ff0726cf20571e29480a99b"
        `);
        await queryRunner.query(`
            ALTER TABLE "teams" DROP CONSTRAINT "FK_f09b3fd06a61a5c842d3a8e0dee"
        `);
        await queryRunner.query(`
            ALTER TABLE "teams" DROP CONSTRAINT "FK_efa32c8850c6857db07943ae07d"
        `);
        await queryRunner.query(`
            ALTER TABLE "team_admins" DROP CONSTRAINT "FK_07854d1c6c31d23ae3c51b1be2b"
        `);
        await queryRunner.query(`
            ALTER TABLE "team_admins" DROP CONSTRAINT "FK_c0c96f688504d5b06c6fb9c880e"
        `);
        await queryRunner.query(`
            ALTER TABLE "tournaments" DROP CONSTRAINT "FK_3c1b303314881c72973ed076b12"
        `);
        await queryRunner.query(`
            ALTER TABLE "tournament_phases" DROP CONSTRAINT "FK_997c8455e3dde2951b27c33335b"
        `);
        await queryRunner.query(`
            ALTER TABLE "tournament_phases" DROP CONSTRAINT "FK_d3cd17b3f63a5b3c7cecb94bd1c"
        `);
        await queryRunner.query(`
            ALTER TABLE "matches" DROP CONSTRAINT "FK_4445c1b2bd39fe81088ea640acb"
        `);
        await queryRunner.query(`
            ALTER TABLE "matches" DROP CONSTRAINT "FK_721191f60100575734fb03261f3"
        `);
        await queryRunner.query(`
            ALTER TABLE "users_matches" DROP CONSTRAINT "FK_c5ee9e5f766df5f535bce89595b"
        `);
        await queryRunner.query(`
            ALTER TABLE "users_matches" DROP CONSTRAINT "FK_644bad3bb13869d466177f9afa9"
        `);
        await queryRunner.query(`
            ALTER TABLE "users_matches" DROP CONSTRAINT "FK_22f8a4c8c3cbca3a419888a7653"
        `);
        await queryRunner.query(`
            ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_18d34df8212648b698828f244fb"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_eae09d4f95afa5ae30c28384607"
        `);
        await queryRunner.query(`
            ALTER TABLE "friends" DROP CONSTRAINT "FK_2bf15b5bc266f5246f0edd42e1d"
        `);
        await queryRunner.query(`
            ALTER TABLE "friends" DROP CONSTRAINT "FK_f2f2c18e6cb5a91e3a2e6cda3cb"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_game_accounts" DROP CONSTRAINT "FK_02f30d1ed7a1d927b29f1d3d693"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_settings" DROP CONSTRAINT "FK_4ed056b9344e6f7d8d46ec4b302"
        `);
        await queryRunner.query(`
            ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c2bf4967c8c2a6b845dadfbf3d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fdad7d5768277e60c40e01cdce"
        `);
        await queryRunner.query(`
            DROP TABLE "team_members"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b4806f0183effb3d190eef583f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_98e38a7c7139bbda0c4f2fcb59"
        `);
        await queryRunner.query(`
            DROP TABLE "match_teams"
        `);
        await queryRunner.query(`
            DROP TABLE "admin_invites"
        `);
        await queryRunner.query(`
            DROP TABLE "messages"
        `);
        await queryRunner.query(`
            DROP TABLE "chats"
        `);
        await queryRunner.query(`
            DROP TABLE "chat_participants"
        `);
        await queryRunner.query(`
            DROP TABLE "notifications"
        `);
        await queryRunner.query(`
            DROP TABLE "organizations"
        `);
        await queryRunner.query(`
            DROP TABLE "org_members"
        `);
        await queryRunner.query(`
            DROP TABLE "team_invitations"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."team_invitations_status_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP TABLE "teams"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."teams_status_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "team_admins"
        `);
        await queryRunner.query(`
            DROP TABLE "tournaments"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."tournaments_status_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "tournament_phases"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."tournament_phases_type_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "matches"
        `);
        await queryRunner.query(`
            DROP TABLE "users_matches"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."users_matches_result_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "games"
        `);
        await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
        await queryRunner.query(`
            DROP TABLE "user_blocks"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3e10b1567744550d0cf8c09159"
        `);
        await queryRunner.query(`
            DROP TABLE "friends"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c7c60be37c4a8a257c60a6ff5f"
        `);
        await queryRunner.query(`
            DROP TABLE "user_game_accounts"
        `);
        await queryRunner.query(`
            DROP TABLE "user_settings"
        `);
        await queryRunner.query(`
            DROP TABLE "user_profiles"
        `);
    }

}
